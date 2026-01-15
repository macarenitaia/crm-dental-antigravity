
-- Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    embedding vector(768), -- text-embedding-004 is 768 dims
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy (Public Read for now, or service role only?)
-- Agent uses service role, so this is fine.
CREATE POLICY "Public Read Knowledge Base" ON knowledge_base
FOR SELECT TO anon, authenticated, service_role USING (true);

-- Functions for Similarity Search
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity -- Cosine similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
