import express from 'express';
import { query } from '../db.js';
import {
  embedQuery,
  retrieveChunks,
  generateAnswer,
  REFUSAL_THRESHOLD,
  REFUSAL_MESSAGE,
} from '../rag.js';

export const router = express.Router();

router.post('/chat', async (req, res) => {
  const start = Date.now();
  const message = req.body?.message;

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message (string) is required' });
  }

  try {
    const embedding = await embedQuery(message);
    const chunks = await retrieveChunks(embedding);
    const topScore = chunks[0]?.similarity ?? 0;

    let answer;
    let wasRefused = false;

    if (topScore < REFUSAL_THRESHOLD) {
      wasRefused = true;
      answer = REFUSAL_MESSAGE;
    } else {
      answer = await generateAnswer(message, chunks);
    }

    const sources = chunks.map((c) => ({
      source_path: c.source_path,
      title: c.title,
      heading: c.heading,
      similarity: Number(c.similarity.toFixed(4)),
    }));

    const latencyMs = Date.now() - start;

    await query(
      `INSERT INTO chat_logs
         (query, response, retrieved_sources, latency_ms, was_refused)
       VALUES ($1, $2, $3, $4, $5)`,
      [message, answer, JSON.stringify(sources), latencyMs, wasRefused],
    );

    res.json({ answer, sources, refused: wasRefused });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/admin/logs', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const { rows } = await query(
      `SELECT id, query, response, retrieved_sources, latency_ms, was_refused, created_at
       FROM chat_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    res.json({ count: rows.length, logs: rows });
  } catch (err) {
    console.error('Logs error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
