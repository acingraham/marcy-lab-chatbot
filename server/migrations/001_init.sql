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

-- No ANN index: at ~1.5k chunks sequential scan over pgvector is faster
-- and exact. Add an IVFFlat or HNSW index here once the corpus grows past
-- ~10k chunks.

CREATE TABLE IF NOT EXISTS chat_logs (
  id                 SERIAL PRIMARY KEY,
  query              TEXT NOT NULL,
  response           TEXT NOT NULL,
  retrieved_sources  JSONB,
  latency_ms         INTEGER,
  was_refused        BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMP DEFAULT NOW()
);
