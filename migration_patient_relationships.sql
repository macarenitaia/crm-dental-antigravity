-- 1. Asegurar columnas básicas en clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT;

-- 2. Crear tabla de relaciones familiares
CREATE TABLE IF NOT EXISTS public.client_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    related_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'Padre', 'Hijo', 'Cónyuge', etc.
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados
    UNIQUE(client_id, related_client_id, relationship_type)
);

-- 3. RLS para la nueva tabla
ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.client_relationships;
CREATE POLICY "Enable all access for authenticated users" ON public.client_relationships
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Comentarios
COMMENT ON TABLE public.client_relationships IS 'Relaciones familiares entre pacientes';
