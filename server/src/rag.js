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
- Lead with the concept in plain English before showing code. Use a teacher's voice — explain the *why* before the *how*.
- Prefer one well-explained example over an exhaustive checklist. Students learning a topic remember a clear story better than a list of bullet points.
- Be beginner-friendly. Use short paragraphs and inline code formatting for short snippets; reserve full code blocks for examples that genuinely benefit from them.`;

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

function buildMessages(question, chunks, history = []) {
  const context = chunks.map((c) => c.content).join('\n\n---\n\n');
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const m of history.slice(-6)) {
    if (m?.role === 'user' || m?.role === 'assistant') {
      messages.push({ role: m.role, content: String(m.content ?? '') });
    }
  }
  messages.push({
    role: 'user',
    content: `Marcy Docs context for this question:\n\n${context}\n\nQuestion: ${question}`,
  });
  return messages;
}

const REWRITE_SYSTEM_PROMPT = `Given a conversation between a Marcy student and an assistant, rewrite the student's latest message as a standalone search query suitable for a vector database lookup against the Marcy curriculum. Resolve pronouns and references to prior turns. If the latest message is already a standalone query, return it unchanged. Return ONLY the rewritten query — no quotes, no preamble, no explanation.`;

export async function rewriteQuery(history, currentQuery) {
  if (!history?.length) return currentQuery;
  const recent = history.slice(-6).filter(
    (m) => m?.role === 'user' || m?.role === 'assistant',
  );
  if (recent.length === 0) return currentQuery;

  const transcript = recent
    .map(
      (m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${String(m.content ?? '')}`,
    )
    .join('\n\n');

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: REWRITE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${transcript}\n\nStudent (latest): ${currentQuery}\n\nStandalone search query:`,
      },
    ],
    temperature: 0,
    max_tokens: 200,
  });

  const rewritten = completion.choices[0]?.message?.content?.trim();
  return rewritten || currentQuery;
}

export async function generateAnswer(question, chunks, history = []) {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildMessages(question, chunks, history),
    temperature: 0.2,
  });
  return completion.choices[0].message.content;
}

export async function* generateAnswerStream(question, chunks, history = []) {
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildMessages(question, chunks, history),
    temperature: 0.2,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
