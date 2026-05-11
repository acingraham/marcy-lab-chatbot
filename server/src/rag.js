import OpenAI from 'openai';
import { query } from './db.js';

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

export const TOP_K = 5;
export const REFUSAL_THRESHOLD = 0.3;
export const REFUSAL_MESSAGE =
  "I'm designed to help with Marcy curriculum and software engineering study questions. " +
  "I couldn't find relevant Marcy Docs context for that question, so I can't answer it reliably.";

const SYSTEM_PROMPT = `You are a Marcy Lab School study assistant. You help students understand software engineering, programming, and computer science topics covered in the Marcy curriculum.

Rules:
- Answer using the provided Marcy Docs context below. Quote terminology the docs use.
- If the context does not contain the answer, say so plainly — do not invent curriculum guidance.
- Refuse questions unrelated to Marcy curriculum or software engineering.
- Be beginner-friendly and concrete. Use short paragraphs and code examples when helpful.`;

const openai = new OpenAI();

export async function embedQuery(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

export async function retrieveChunks(embedding, limit = TOP_K) {
  const vectorLiteral = `[${embedding.join(',')}]`;
  const { rows } = await query(
    `SELECT
       source_path,
       title,
       heading,
       content,
       1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, limit],
  );
  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
}

function buildMessages(question, chunks) {
  const context = chunks.map((c) => c.content).join('\n\n---\n\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Marcy Docs context:\n\n${context}\n\nQuestion: ${question}`,
    },
  ];
}

export async function generateAnswer(question, chunks) {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildMessages(question, chunks),
    temperature: 0.2,
  });
  return completion.choices[0].message.content;
}
