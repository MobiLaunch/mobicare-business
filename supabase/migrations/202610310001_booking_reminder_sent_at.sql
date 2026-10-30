-- Day-before booking reminders mark the booking so each customer is emailed once.
alter table public.bookings add column if not exists reminder_sent_at timestamptz;
