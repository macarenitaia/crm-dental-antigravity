
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public access clinics" ON clinics;
DROP POLICY IF EXISTS "Public access appointments" ON appointments;
DROP POLICY IF EXISTS "Public access clients" ON clients;
DROP POLICY IF EXISTS "Public access messages" ON messages;

-- Create permissive policies for all tables (Allow ALL for now)
-- 1. CLINICS
CREATE POLICY "Public access clinics" ON clinics
FOR ALL USING (true) WITH CHECK (true);

-- 2. APPOINTMENTS
CREATE POLICY "Public access appointments" ON appointments
FOR ALL USING (true) WITH CHECK (true);

-- 3. CLIENTS
CREATE POLICY "Public access clients" ON clients
FOR ALL USING (true) WITH CHECK (true);

-- 4. MESSAGES
CREATE POLICY "Public access messages" ON messages
FOR ALL USING (true) WITH CHECK (true);
