import 'dotenv/config';
import OpenAI from 'openai';
import { pool } from './db.js';
import { chunkAllDocs } from './chunker.js';

const docsRoot = process.argv[2] || 'data/marcy-curriculum-docs';
const BATCH_SIZE = 64;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Add it to .env and re-run.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env and re-run.');
  process.exit(1);
}

const openai = new OpenAI();

console.log(`Chunking docs from ${docsRoot}...`);
const chunks = chunkAllDocs(docsRoot);
console.log(`Generated ${chunks.length} chunks.`);

console.log('Clearing existing document_chunks (destructive re-ingest)...');
await pool.query('TRUNCATE document_chunks RESTART IDENTITY');

console.log(`Embedding with ${EMBEDDING_MODEL} in batches of ${BATCH_SIZE}...`);
const start = Date.now();

for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: batch.map((c) => c.content),
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = `[${response.data[j].embedding.join(',')}]`;
      await client.query(
        `INSERT INTO document_chunks
           (source_path, title, heading, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [chunk.source_path, chunk.title, chunk.heading, chunk.chunk_index, chunk.content, embedding],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const done = Math.min(i + BATCH_SIZE, chunks.length);
  process.stdout.write(`\r  Embedded + inserted ${done} / ${chunks.length}`);
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s.`);
await pool.end();
