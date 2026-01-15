
-- 🛡️ ARMADURA ANTI-SOLAPAMIENTO (Run in Supabase SQL Editor)

-- 1. Create a unique index on start_time.
-- We filter WHERE status != 'cancelled' so we CAN have multiple cancelled appointments at the same time,
-- but only ONE 'scheduled' or 'confirmed' one.

CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_appointment_time" 
ON "public"."appointments" ("start_time") 
WHERE status != 'cancelled';

-- 2. (Optional) Comment to explain
COMMENT ON INDEX "unique_active_appointment_time" IS 'Ensures no two active appointments share the same start time.';
