# API Specification

**Base URL:** `/api/v1`

## Authentication

All endpoints except `/auth/register`, `/auth/login`, and `/auth/request-otp` require a Bearer JWT token.

**Header:** `Authorization: Bearer <token>`

### POST /auth/register
Register a new resident account.
```json
{
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "middle_name": "Santos",
  "email": "juan@example.com",
  "contact_number": "09171234567",
  "birth_date": "1990-01-15",
  "address": "123 Street, Barangay Dolores, Taytay, Rizal",
  "password": "securepassword123"
}
```

### POST /auth/login
Authenticate and receive JWT token.
```json
{
  "email": "juan@example.com",
  "password": "securepassword123"
}
```

### POST /auth/request-otp
Request OTP verification code via SMS.
```json
{
  "contact_number": "09171234567"
}
```

### POST /auth/verify-otp
Verify the OTP code.
```json
{
  "contact_number": "09171234567",
  "otp_code": "123456"
}
```

### GET /auth/me
Get current authenticated user profile.

### GET /services
List available services.

### GET /services/:id
Get service details.

### POST /services
Create a new service (admin only).
```json
{
  "name": "Barangay Clearance",
  "description": "Request for barangay clearance certificate",
  "duration_minutes": 30,
  "slot_capacity_per_day": 20,
  "department": "Administrative"
}
```

### GET /appointments/slots?service_id=:id&appointment_date=2026-06-01
Get available time slots for a service on a date.

### POST /appointments
Book an appointment.
```json
{
  "service_id": "uuid-here",
  "appointment_date": "2026-06-01",
  "start_time": "09:00"
}
```

### GET /appointments/my?status_filter=scheduled
Get current user's appointments.

### PATCH /appointments/:id/cancel
Cancel an appointment.

### PATCH /appointments/:id/reschedule
Reschedule an appointment.
```json
{
  "appointment_date": "2026-06-05",
  "start_time": "10:00"
}
```

### GET /admin/stats
Get system statistics (admin only).

### GET /admin/queue?date_filter=2026-06-01
Get queue board for a specific date.

### GET /residents?page=1&per_page=20&search=juan&status_filter=pending
List residents with pagination and search (admin only).

### PATCH /residents/:id/activate
Activate a resident account (admin only).
