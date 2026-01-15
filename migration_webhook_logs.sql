-- Create a table to log webhook attempts and errors
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method TEXT,
    url TEXT,
    headers JSONB,
    body JSONB,
    query_params JSONB,
    status_code INTEGER,
    response_body TEXT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow all (for debugging)
CREATE POLICY "Allow all for webhook_logs" ON webhook_logs FOR ALL USING (true);
