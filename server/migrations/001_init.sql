CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
  id           SERIAL PRIMARY KEY,
  source_path  TEXT NOT NULL,
  title        TEXT,
  heading      TEXT,
  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS chat_logs (
  id                 SERIAL PRIMARY KEY,
  query              TEXT NOT NULL,
  response           TEXT NOT NULL,
  retrieved_sources  JSONB,
  latency_ms         INTEGER,
  was_refused        BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMP DEFAULT NOW()
);
