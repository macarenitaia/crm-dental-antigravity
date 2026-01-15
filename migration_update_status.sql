-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Drop the existing check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- 2. Add the new constraint with all valid statuses
ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed'));
