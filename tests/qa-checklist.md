# QA Checklist — Smart Appointment Scheduling Kiosk

## BACKEND API TESTS

### Authentication
- [ ] POST /api/v1/auth/register — creates resident with status=pending
- [ ] POST /api/v1/auth/register — returns 400 for duplicate contact_number
- [ ] POST /api/v1/auth/login — returns JWT for valid credentials
- [ ] POST /api/v1/auth/login — returns 401 for wrong password
- [ ] POST /api/v1/auth/request-otp — sends SMS (logs if no API key)
- [ ] POST /api/v1/auth/verify-otp — accepts valid 6-digit OTP
- [ ] POST /api/v1/auth/verify-otp — rejects expired OTP
- [ ] POST /api/v1/auth/verify-otp — rejects wrong OTP
- [ ] GET /api/v1/auth/me — returns current user profile
- [ ] GET /api/v1/auth/me — returns 401 without token

### Services
- [ ] GET /api/v1/services — returns active services only
- [ ] GET /api/v1/services?include_inactive=true — returns all
- [ ] POST /api/v1/services — creates service (admin only)
- [ ] POST /api/v1/services — returns 403 for non-admin
- [ ] PATCH /api/v1/services/:id — updates service
- [ ] DELETE /api/v1/services/:id — deactivates service (soft delete)

### Appointments
- [ ] GET /api/v1/appointments/slots?service_id=X&appointment_date=Y — returns slots
- [ ] POST /api/v1/appointments — creates appointment for active+enrolled user
- [ ] POST /api/v1/appointments — returns 403 if user not active
- [ ] POST /api/v1/appointments — returns 403 if fingerprint not enrolled
- [ ] POST /api/v1/appointments — returns 409 for double-booking
- [ ] GET /api/v1/appointments/my — returns user's appointments
- [ ] PATCH /api/v1/appointments/:id/cancel — cancels own appointment
- [ ] PATCH /api/v1/appointments/:id/cancel — returns 400 for already completed
- [ ] PATCH /api/v1/appointments/:id/reschedule — changes date/time

### Admin
- [ ] GET /api/v1/admin/stats — returns dashboard stats
- [ ] GET /api/v1/admin/stats — returns 401 without token
- [ ] GET /api/v1/admin/stats — returns 403 for non-admin
- [ ] GET /api/v1/admin/queue — returns today's schedule
- [ ] GET /api/v1/admin/queue?date_filter=2026-06-15 — returns filtered
- [ ] GET /api/v1/residents?page=1&per_page=20 — paginated list
- [ ] GET /api/v1/residents?search=juan — filtered search
- [ ] GET /api/v1/residents?status_filter=pending — status filter
- [ ] PATCH /api/v1/residents/:id/activate — activates a resident

### Conflict Detection
- [ ] Two users can't book same time+service
- [ ] Same user can't book two overlapping slots
- [ ] Different services at same time is allowed
- [ ] Service capacity per day is enforced
- [ ] Rescheduling frees up old slot
- [ ] Cancelling frees up the slot

## FRONTEND TESTS

### Pages
- [ ] Home page loads with hero + features + how-it-works sections
- [ ] Register page shows all required fields
- [ ] Register validates contact number format
- [ ] Register validates password length (min 6)
- [ ] Register validates password match
- [ ] OTP page shows 6-digit input
- [ ] OTP backspace navigates to previous field
- [ ] Login page shows email + password fields
- [ ] Error messages display correctly (red alert boxes)
- [ ] Success messages display correctly (green alert boxes)

### Booking Flow
- [ ] Unauthenticated user is redirected to login
- [ ] Non-active user sees activation error message
- [ ] Non-enrolled user sees fingerprint enrollment message
- [ ] Service list page shows all active services
- [ ] Date picker shows available dates
- [ ] Time slot grid shows available/occupied slots
- [ ] Confirmation screen shows booking details
- [ ] Success screen shows reference number + queue number

### My Appointments
- [ ] Shows list of user's appointments
- [ ] Filter tabs (All, Scheduled, Checked In, Completed, Cancelled)
- [ ] Cancel button works for scheduled/confirmed
- [ ] Cancel button hidden for completed/cancelled

### Admin Dashboard
- [ ] Queue board shows today's appointments
- [ ] Stats cards show correct counts
- [ ] Services tab lists all services
- [ ] Residents tab lists with search
- [ ] Activate button works for pending residents
- [ ] Stats tab shows overview numbers

### Responsive
- [ ] Home page renders correctly on mobile (375px)
- [ ] Registration form is mobile-friendly
- [ ] Booking wizard is mobile-friendly
- [ ] Admin tables horizontally scrollable on mobile

## KIOSK (RPi4 + ESP32)

### Check-in Flow
- [ ] Home screen shows "Check In" and "Enroll" buttons
- [ ] Fingerprint scan screen shows instructions
- [ ] Case A: matched + has appointment → shows positive result
- [ ] Case B: matched + no appointment → shows info result
- [ ] Case C: not matched → shows error result
- [ ] Result screen auto-returns to home after timeout
- [ ] Cancel button returns to home
- [ ] ESP32 ping/kick detection if disconnected

### Enrollment
- [ ] Staff can initiate enrollment flow
- [ ] Fingerprint is captured (3-step: scan 1 → remove → scan 2)
- [ ] Template ID is sent to backend
- [ ] Backend records template ID against resident

### Error Handling
- [ ] ESP32 disconnected shows error overlay
- [ ] Backend API down shows appropriate message
- [ ] Wrong finger shows correct error message

## ESP32 FIRMWARE
See `tests/esp32-test-plan.md` for complete hardware test plan.

## SECURITY TESTS
- [ ] JWT token is required for protected endpoints
- [ ] Invalid token returns 401
- [ ] Non-admin can't access admin endpoints
- [ ] Resident can only access own appointments
- [ ] Fingerprint template ID is integer, not full template
- [ ] Passwords are bcrypt-hashed in database
- [ ] SQL injection is prevented via SQLAlchemy parameterization
- [ ] CORS allows only configured origins

## EDGE CASES
- [ ] Booking for the same day — does it work?
- [ ] Cancelling and re-booking the same slot
- [ ] Multiple residents booking at the exact same millisecond
- [ ] User registers but never activates — can they still login?
- [ ] Service deactivated while residents have upcoming bookings
- [ ] Fingerprint sensor enrollment fails mid-way
- [ ] Large number of residents (1000+) in directory

## PERFORMANCE
- [ ] Appointment listing < 500ms for 100 items
- [ ] Slot availability check < 200ms
- [ ] Login flow < 1s
- [ ] Queue board loads < 1s with 50 appointments
