# Database Schema

## Tables

### residents
Stores user accounts and fingerprint data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| first_name | VARCHAR(100) | First name |
| last_name | VARCHAR(100) | Last name |
| middle_name | VARCHAR(100) | Middle name (nullable) |
| email | VARCHAR(255) | Email address (unique, nullable) |
| contact_number | VARCHAR(20) | Mobile number |
| birth_date | DATE | Date of birth |
| address | VARCHAR(500) | Home address |
| password_hash | VARCHAR(255) | Bcrypt password hash |
| role | ENUM | resident, encoder, verifier, admin |
| status | ENUM | pending, active, suspended |
| fingerprint_template_id | INTEGER | AS608 template ID (nullable) |
| fingerprint_enrolled_at | TIMESTAMP | When fingerprint was enrolled |
| otp_verified | BOOLEAN | Whether OTP was verified |
| otp_code | VARCHAR(6) | Current OTP code (nullable) |
| otp_expires_at | TIMESTAMP | OTP expiration (nullable) |
| activated_by | UUID (FK) | Admin who activated (nullable) |
| activated_at | TIMESTAMP | When activated |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

### services
Barangay services offered.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | VARCHAR(200) | Service name |
| description | VARCHAR(1000) | Service description |
| duration_minutes | INTEGER | Appointment duration |
| slot_capacity_per_day | INTEGER | Max appointments per day |
| is_active | BOOLEAN | Whether service is active |
| department | VARCHAR(100) | Department name |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

### appointments
Appointment records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| resident_id | UUID (FK) | References residents |
| service_id | UUID (FK) | References services |
| appointment_date | DATE | Scheduled date |
| start_time | TIME | Start time |
| end_time | TIME | End time |
| status | VARCHAR(20) | scheduled, confirmed, checked_in, completed, cancelled, no_show |
| queue_number | INTEGER | Queue number for the day |
| notes | VARCHAR(500) | Optional notes |
| verified_by_fingerprint | BOOLEAN | Whether verified by kiosk |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

### time_slots
Pre-defined time slots (optional, auto-generated).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| service_id | UUID (FK) | References services |
| date | DATE | Slot date |
| start_time | TIME | Start time |
| end_time | TIME | End time |
| is_available | BOOLEAN | Whether slot is free |
| version | INTEGER | Optimistic locking version |
| created_at | TIMESTAMP | Record created |

### notifications
SMS/email notification log.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| appointment_id | UUID (FK) | References appointments |
| type | VARCHAR(20) | reminder, confirmation, alert |
| channel | VARCHAR(10) | sms, email |
| recipient | VARCHAR(255) | Phone or email |
| message | VARCHAR(1000) | Message content |
| sent_at | TIMESTAMP | When sent |
| status | VARCHAR(10) | pending, sent, failed |
| created_at | TIMESTAMP | Record created |
