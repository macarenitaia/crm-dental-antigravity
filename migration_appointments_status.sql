
-- Update appointments status check constraint to include 'needs_reschedule' and 'available'
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'needs_reschedule', 'available'));
