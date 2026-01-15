-- URGENT FIX: Permissive RLS Policies for Development
-- The auth-based policies are blocking anonymous access
-- This adds permissive policies for all tables to restore functionality

-- 1. CLIENTS TABLE
DROP POLICY IF EXISTS "Public Read Clients" ON public.clients;
DROP POLICY IF EXISTS "Public Write Clients" ON public.clients;
CREATE POLICY "Public Read Clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public Write Clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- 2. MESSAGES TABLE
DROP POLICY IF EXISTS "Public Read Messages" ON public.messages;
DROP POLICY IF EXISTS "Public Write Messages" ON public.messages;
CREATE POLICY "Public Read Messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Public Write Messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 3. APPOINTMENTS TABLE  
DROP POLICY IF EXISTS "Public Read Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public Write Appointments" ON public.appointments;
CREATE POLICY "Public Read Appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Public Write Appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- 4. CONVERSATIONS TABLE
DROP POLICY IF EXISTS "Public Read Conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public Write Conversations" ON public.conversations;
CREATE POLICY "Public Read Conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Public Write Conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- 5. CONTACTS TABLE
DROP POLICY IF EXISTS "Public Read Contacts" ON public.contacts;
DROP POLICY IF EXISTS "Public Write Contacts" ON public.contacts;
CREATE POLICY "Public Read Contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Public Write Contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- 6. CLINICS TABLE
DROP POLICY IF EXISTS "Public Read Clinics" ON public.clinics;
CREATE POLICY "Public Read Clinics" ON public.clinics FOR SELECT USING (true);

-- 7. DOCTORES TABLE
DROP POLICY IF EXISTS "Public Read Doctores" ON public.doctores;
CREATE POLICY "Public Read Doctores" ON public.doctores FOR SELECT USING (true);

-- 8. TRATAMIENTOS_NEW TABLE
DROP POLICY IF EXISTS "Public Read Tratamientos New" ON public.tratamientos_new;
CREATE POLICY "Public Read Tratamientos New" ON public.tratamientos_new FOR SELECT USING (true);

-- 9. KNOWLEDGE/KNOWLEDGE_BASE TABLES
DROP POLICY IF EXISTS "Public Read Knowledge" ON public.knowledge;
DROP POLICY IF EXISTS "Public Read Knowledge Base" ON public.knowledge_base;
CREATE POLICY "Public Read Knowledge" ON public.knowledge FOR SELECT USING (true);
CREATE POLICY "Public Read Knowledge Base" ON public.knowledge_base FOR SELECT USING (true);

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
