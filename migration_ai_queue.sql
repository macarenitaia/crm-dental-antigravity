-- Create AI Chat Queue table for assistant negotiation
CREATE TABLE IF NOT EXISTS public.ai_chat_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE, -- Patient
    cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000', -- Tenant
    context jsonb NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'resolved')),
    created_at timestamptz DEFAULT now()
);

-- Add indexes for the queue
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON public.ai_chat_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_queue_cliente ON public.ai_chat_queue(cliente_id);

-- Enable RLS
ALTER TABLE public.ai_chat_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access ai_queue" ON public.ai_chat_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);
