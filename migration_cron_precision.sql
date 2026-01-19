-- Migration: Cron Precision Flags
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS review_sent BOOLEAN DEFAULT false;

-- Create indexes for faster lookups in cron jobs
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent ON public.appointments(reminder_sent) WHERE reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_appointments_review_sent ON public.appointments(review_sent) WHERE review_sent = false;
