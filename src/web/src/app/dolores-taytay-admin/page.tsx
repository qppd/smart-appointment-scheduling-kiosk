'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthChange, getUserData, signOut } from '@/lib/auth';
import {
  subscribeAllServices,
  subscribeAllAppointments,
  subscribeUsers,
  createService,
  updateService,
  permanentlyDeleteService,
} from '@/lib/rtdb';
import type { Service, Appointment, User as UserType } from '@/types';
import {
  Briefcase, ListOrdered, Users as UsersIcon, BarChart3, Search,
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, ChevronDown,
  UserCircle, Settings as SettingsIcon, LogOut, Shield, Loader2, AlertOctagon,
  Calendar, Fingerprint, CheckCircle, ArrowUp, ArrowDown,
} from 'lucide-react';

const ADMIN_EMAIL = 'quezon.province.pd@gmail.com';

type SortDirection = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Utility hook                                                         */
/* ------------------------------------------------------------------ */
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, handler]);
}

/* ------------------------------------------------------------------ */
/*  Data-table hook                                                      */
/* ------------------------------------------------------------------ */
function useTableState<T extends Record<string, any>>(initialData: T[], defaultPer = 10) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPer);

  const filtered = useMemo(() => {
    if (!search.trim()) return initialData;
    const q = search.toLowerCase();
    return initialData.filter((item) =>
      Object.values(item).some((v) =>
        v != null && String(v).toLowerCase().includes(q)
      )
    );
  }, [initialData, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = (aVal as string).toLowerCase().localeCompare((bVal as string).toLowerCase());
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = (aVal as number) - (bVal as number);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const paged = useMemo(() => sorted.slice(startIdx, startIdx + perPage), [sorted, startIdx, perPage]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return {
    search, setSearch,
    sortKey,
    sortDir,
    toggleSort,
    page, setPage: (p: number) => { setPage(p); },
    perPage, setPerPage: (n: number) => { setPerPage(n); setPage(1); },
    paged, total, startIdx: (safePage - 1) * perPage + 1,
    endIdx: Math.min(safePage * perPage, total),
    totalPages, safePage,
  };
}

/* ------------------------------------------------------------------ */
/*  Service modal                                                        */
/* ------------------------------------------------------------------ */
interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Service>) => void;
  service?: Service | null;
}

function ServiceModal({ isOpen, onClose, onSubmit, service }: ServiceModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    slot_capacity_per_day: 10,
    department: '',
    is_active: true,
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        description: service.description || '',
        duration_minutes: service.duration_minutes,
        slot_capacity_per_day: service.slot_capacity_per_day,
        department: service.department || '',
        is_active: service.is_active,
      });
    } else {
      setForm({
        name: '',
        description: '',
        duration_minutes: 30,
        slot_capacity_per_day: 10,
        department: '',
        is_active: true,
      });
    }
  }, [service, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{service ? 'Edit Service' : 'Add Service'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number" required min={5}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity / day</label>
              <input
                type="number" required min={1}
                value={form.slot_capacity_per_day}
                onChange={(e) => setForm({ ...form, slot_capacity_per_day: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation modal                                            */
/* ------------------------------------------------------------------ */
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

function DeleteModal({ isOpen, onClose, onConfirm, title, message }: DeleteModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data-table UI wrapper                                                */
/* ------------------------------------------------------------------ */
interface TableCol<T> {
  key: string;
  label: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  tableState,
  actions,
}: {
  columns: TableCol<T>[];
  data: T[];
  tableState: ReturnType<typeof useTableState<T>>;
  actions?: { label: string; icon: React.ReactNode; onClick: (item: T) => void; className?: string }[];
}) {
  const { search, setSearch, sortKey, sortDir, toggleSort, page, setPage, perPage, setPerPage, paged, total, startIdx, endIdx, totalPages } = tableState;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {[5, 10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => toggleSort(col.key as keyof T)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />
                    ) : (
                      <span className="text-gray-400 text-[10px]">↕</span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            ) : (
              paged.map((item, index) => (
                <tr key={item.id ?? index} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-gray-700">
                      {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => action.onClick(item)}
                            className={`p-1.5 rounded-md hover:bg-gray-100 ${action.className ?? ''}`}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          Showing <span className="font-medium">{startIdx}</span> to <span className="font-medium">{endIdx}</span> of <span className="font-medium">{total}</span> records
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-teal-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                       */
/* ------------------------------------------------------------------ */
export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<keyof typeof sectionLabels>('services');
  const [authUser, setAuthUser] = useState<any>(null);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  /* data */
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  /* modals */
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  /* auth check */
  useEffect(() => {
    let unsubServices: (() => void) | null = null;
    let unsubAppointments: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    const authUnsub = onAuthChange((u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setAuthUser(u);
      setUserEmail(u.email || '');

      getUserData(u.uid).then((userData) => {
        const isUserAdmin = userData?.role === 'admin' || u.email === ADMIN_EMAIL;
        setIsAdmin(isUserAdmin);
        setChecking(false);

        if (userData) {
          setUserName(`${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Admin');
        }

        if (isUserAdmin) {
          const us = subscribeAllServices((s) => setServices(s));
          unsubServices = us;
          const ua = subscribeAllAppointments((a) => setAppointments(a));
          unsubAppointments = ua;
          const uu = subscribeUsers((uu) => setUsers(uu));
          unsubUsers = uu;
        }
      });
    });

    return () => {
      authUnsub();
      if (unsubServices) unsubServices();
      if (unsubAppointments) unsubAppointments();
      if (unsubUsers) unsubUsers();
    };
  }, [router]);

  /* table states */
  const servicesTable = useTableState(services);
  const queuesTable = useTableState(appointments);
  const residentsTable = useTableState(users);

  /* user dropdown */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  /* sidebar helpers */
  const sectionLabels: Record<string, string> = {
    services: 'Services',
    queues: 'Queues',
    residents: 'Residents',
    stats: 'Statistics',
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  /* service crud */
  const handleAddService = async (data: Partial<Service>) => {
    try {
      await createService(data as any);
      setServiceModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add service.');
    }
  };

  const handleEditService = async (data: Partial<Service>) => {
    if (!editingService) return;
    try {
      await updateService(editingService.id, data);
      setServiceModalOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update service.');
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;
    try {
      await permanentlyDeleteService(deletingService.id);
      setDeleteModalOpen(false);
      setDeletingService(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete service.');
    }
  };

  const openAddService = () => { setEditingService(null); setServiceModalOpen(true); };
  const openEditService = (s: Service) => { setEditingService(s); setServiceModalOpen(true); };
  const openDeleteService = (s: Service) => { setDeletingService(s); setDeleteModalOpen(true); };

  /* stats */
  const checkedInCount = appointments.filter((a) => a.status === 'checked_in').length;
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const activeServicesCount = services.filter((s) => s.is_active).length;

  /* guards */
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-gray-500 mt-4">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertOctagon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">You do not have permission to access the admin dashboard.</p>
          <button onClick={() => router.push('/')} className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Sidebar items                                                        */
  /* ------------------------------------------------------------------ */
  const sidebarItems: { key: keyof typeof sectionLabels; label: string; icon: any }[] = [
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'queues', label: 'Queues', icon: ListOrdered },
    { key: 'residents', label: 'Residents', icon: UsersIcon },
    { key: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  /* ------------------------------------------------------------------ */
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-teal-700 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-teal-600">
          <Shield className="h-6 w-6 text-teal-200 mr-2" />
          <span className="text-white font-bold text-lg tracking-tight">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-teal-100 hover:bg-teal-600/50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-teal-600">
          <p className="text-teal-200 text-xs text-center">Barangay Dolores
Appointment System</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">{sectionLabels[tab]}</h2>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
                <p className="text-xs text-gray-500 leading-tight">{userEmail}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <button onClick={() => { setDropdownOpen(false); router.push('/profile'); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <UserCircle className="h-4 w-4 text-gray-400" /> Profile
                </button>
                <button onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <SettingsIcon className="h-4 w-4 text-gray-400" /> Settings
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* ─── SERVICES ─────────────────────────────────────────── */}
          {tab === 'services' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Manage Services</h3>
                <button
                  onClick={openAddService}
                  className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Service
                </button>
              </div>
              <DataTable
                data={services}
                tableState={servicesTable}
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'description', label: 'Description', render: (s: Service) => s.description || '—' },
                  { key: 'duration_minutes', label: 'Duration (min)' },
                  { key: 'slot_capacity_per_day', label: 'Capacity / Day' },
                  { key: 'department', label: 'Department', render: (s: Service) => s.department || '—' },
                  {
                    key: 'is_active',
                    label: 'Status',
                    render: (s: Service) => (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    ),
                  },
                ]}
                actions={[
                  {
                    label: 'Edit',
                    icon: <Pencil className="h-4 w-4 text-blue-600" />,
                    onClick: (s) => openEditService(s as Service),
                  },
                  {
                    label: 'Delete',
                    icon: <Trash2 className="h-4 w-4 text-red-600" />,
                    onClick: (s) => openDeleteService(s as Service),
                    className: 'hover:bg-red-50',
                  },
                ]}
              />
            </div>
          )}

          {/* ─── QUEUES ───────────────────────────────────────────── */}
          {tab === 'queues' && (
            <DataTable
              data={appointments}
              tableState={queuesTable}
              columns={[
                { key: 'appointment_date', label: 'Date', render: (a: Appointment) => a.appointment_date },
                { key: 'resident_id', label: 'Resident ID' },
                { key: 'service_name', label: 'Service' },
                { key: 'start_time', label: 'Time', render: (a: Appointment) => `${a.start_time} - ${a.end_time}` },
                { key: 'queue_number', label: 'Queue #' ,
                  render: (a: Appointment) => `#${a.queue_number}`,
                  },
                {
                  key: 'status',
                  label: 'Status',
                  render: (a: Appointment) => {
                    const colors: Record<string, string> = {
                      checked_in: 'bg-green-100 text-green-800',
                      completed: 'bg-blue-100 text-blue-800',
                      scheduled: 'bg-yellow-100 text-yellow-800',
                      cancelled: 'bg-red-100 text-red-800',
                    };
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                    );
                  },
                },
              ]}
            />
          )}

          {/* ─── RESIDENTS ─────────────────────────────────────────── */}
          {tab === 'residents' && (
            <DataTable
              data={users}
              tableState={residentsTable}
              columns={[
                { key: 'first_name', label: 'Name', render: (u: UserType) => `${u.first_name} ${u.last_name}` },
                { key: 'email', label: 'Email', render: (u: UserType) => u.email || '—' },
                { key: 'phone', label: 'Phone', render: (u: UserType) => u.phone || '—' },
                { key: 'address', label: 'Address', render: (u: UserType) => u.address || '—' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (u: UserType) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {u.status}
                    </span>
                  ),
                },
                {
                  key: 'role',
                  label: 'Role',
                  render: (u: UserType) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  ),
                },
              ]}
            />
          )}

          {/* ─── STATS ────────────────────────────────────────────── */}
          {tab === 'stats' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Appointments", value: appointments.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Checked In', value: checkedInCount, icon: Fingerprint, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Pending Activation', value: pendingCount, icon: Loader2, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Active Services', value: activeServicesCount, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4">
                      <div className={`${s.bg} p-3 rounded-lg`}>
                        <Icon className={`h-6 w-6 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-sm text-gray-500">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Residents Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Residents</span>
                    <span className="text-lg font-semibold text-gray-900">{users.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-teal-600 h-3 rounded-full transition-all"
                      style={{ width: users.length > 0 && appointments.length > 0 ? `${Math.min((appointments.length / users.length) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {appointments.length} out of {users.length} residents have made an appointment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <ServiceModal
        isOpen={serviceModalOpen}
        onClose={() => { setServiceModalOpen(false); setEditingService(null); }}
        onSubmit={editingService ? handleEditService : handleAddService}
        service={editingService}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletingService(null); }}
        onConfirm={handleDeleteService}
        title="Delete Service"
        message={`Are you sure you want to delete "${deletingService?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
