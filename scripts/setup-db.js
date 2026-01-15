const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase...');

    // 1. Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('Extension "vector" enabled.');

    // 2. Create Clients Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        whatsapp_id TEXT UNIQUE NOT NULL,
        name TEXT,
        psychological_profile TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table "clients" verified.');

    // 3. Create Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        role TEXT CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table "messages" verified.');

    // 4. Create Appointments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table "appointments" verified.');

    // 5. Create Knowledge Table (RAG)
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding vector(768), -- Gemini Embedding Dimensions
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Table "knowledge" verified.');

    // 6. Create Index for Vector Search
    await client.query(`
      CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('Vector index created.');

    // 7. Create RPC Function for Similarity Search
    await client.query(`
      create or replace function match_knowledge (
        query_embedding vector(768),
        match_threshold float,
        match_count int
      )
      returns table (
        id uuid,
        content text,
        similarity float
      )
      language plpgsql
      as $$
      begin
        return query
        select
          knowledge.id,
          knowledge.content,
          1 - (knowledge.embedding <=> query_embedding) as similarity
        from knowledge
        where 1 - (knowledge.embedding <=> query_embedding) > match_threshold
        order by knowledge.embedding <=> query_embedding
        limit match_count;
      end;
      $$;
    `);
    console.log('RPC function "match_knowledge" created.');

    // 8. Add status column to clients if not exists
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead';
    `);
    console.log('Column "status" added to clients.');

    console.log('Database setup complete!');

  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await client.end();
  }
}

setupDatabase();
