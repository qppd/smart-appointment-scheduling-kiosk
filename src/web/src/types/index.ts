export interface User {
  uid: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  phone: string;
  birth_date: string;
  address: string;
  role: 'resident' | 'admin';
  status: 'pending' | 'active';
  fingerprint_template_id?: number;
  fingerprint_enrolled: boolean;
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
  service_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  queue_number: number;
  notes?: string;
  verified_by_fingerprint: boolean;
  enrollment_otp?: string;
  enrollment_otp_expires_at?: string;
  enrollment_otp_consumed_at?: string;
  created_at: string;
}

export interface KioskCommand {
  id?: string;
  type: 'verify' | 'enroll' | 'delete';
  target_uid?: string;
  slot?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    template_id?: number;
    matched?: boolean;
    matched_uid?: string;
    message?: string;
  };
  created_at: string;
  completed_at?: string;
}

export interface KioskStatus {
  online: boolean;
  last_heartbeat: string;
  esp32_connected: boolean;
  template_count: number;
  current_action: 'idle' | 'verifying' | 'enrolling';
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

export interface StatsResponse {
  total_residents: number;
  today_appointments: number;
  checked_in_today: number;
  pending_activation: number;
  active_services: number;
  as_of: string;
}
