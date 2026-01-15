-- Migration: Add cliente_id to all non-compliant tables for Multi-Tenant segregation
-- Default value is the Demo Tenant UUID

-- 1. citas
ALTER TABLE public.citas 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 2. contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 3. conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 4. knowledge
ALTER TABLE public.knowledge 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 5. knowledge_base
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 6. messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 7. salud
ALTER TABLE public.salud 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 8. tratamientos (old table with different structure)
-- This table has non-standard columns. Adding cliente_id anyway.
ALTER TABLE public.tratamientos 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- Create indexes for performance on cliente_id columns
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON public.citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contacts_cliente ON public.contacts(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversations_cliente ON public.conversations(cliente_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_cliente ON public.knowledge(cliente_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_cliente ON public.knowledge_base(cliente_id);
CREATE INDEX IF NOT EXISTS idx_messages_cliente ON public.messages(cliente_id);
CREATE INDEX IF NOT EXISTS idx_salud_cliente ON public.salud(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_cliente ON public.tratamientos(cliente_id);

-- Existing compliant tables - add indexes if missing
CREATE INDEX IF NOT EXISTS idx_appointments_cliente ON public.appointments(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clients_cliente ON public.clients(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clinics_cliente ON public.clinics(cliente_id);
CREATE INDEX IF NOT EXISTS idx_doctores_cliente ON public.doctores(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_new_cliente ON public.tratamientos_new(cliente_id);
