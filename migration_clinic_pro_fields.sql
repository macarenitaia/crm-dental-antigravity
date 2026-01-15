-- Migration: Add professional fields to clinics and tenants for billing
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS cif TEXT,
ADD COLUMN IF NOT EXISTS address TEXT, -- Add to tenants if missing (usually it's in clinics)
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS cif TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update comments for clarity
COMMENT ON COLUMN public.tenants.cif IS 'Código de Identificación Fiscal del cliente';
COMMENT ON COLUMN public.clinics.cif IS 'CIF específico de la sede si aplica';
