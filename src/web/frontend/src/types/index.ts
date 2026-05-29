export interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  contact_number: string;
  birth_date: string;
  address: string;
  role: string;
  status: string;
  fingerprint_template_id?: number;
  fingerprint_enrolled: boolean;
  otp_verified: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  slot_capacity_per_day: number;
  is_active: boolean;
  department?: string;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Appointment {
  id: string;
  resident_id: string;
  service_id: string;
  service_name?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  queue_number?: number;
  notes?: string;
  verified_by_fingerprint: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: Resident;
}

export interface AppointmentListResponse {
  items: Appointment[];
  total: number;
}

export interface ResidentListResponse {
  items: Resident[];
  total: number;
  page: number;
  per_page: number;
}

export interface QueueItem {
  id: string;
  queue_number: number;
  resident_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  verified_by_fingerprint: boolean;
}

export interface QueueResponse {
  date: string;
  items: QueueItem[];
  total: number;
}

export interface StatsResponse {
  total_residents: number;
  today_appointments: number;
  checked_in_today: number;
  pending_activation: number;
  active_services: number;
  as_of: string;
}
