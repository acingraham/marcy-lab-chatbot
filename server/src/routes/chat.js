import express from 'express';
import { query } from '../db.js';
import {
  embedQuery,
  retrieveChunks,
  generateAnswerStream,
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

  let headersSent = false;
  let fullAnswer = '';
  let wasRefused = false;
  let sources = [];

  try {
    const embedding = await embedQuery(message);
    const chunks = await retrieveChunks(embedding);
    const topScore = chunks[0]?.similarity ?? 0;

    sources = chunks.map((c) => ({
      source_path: c.source_path,
      title: c.title,
      heading: c.heading,
      similarity: Number(c.similarity.toFixed(4)),
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    headersSent = true;

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    send({ type: 'sources', sources });

    if (topScore < REFUSAL_THRESHOLD) {
      wasRefused = true;
      fullAnswer = REFUSAL_MESSAGE;
      send({ type: 'refused' });
      send({ type: 'token', content: REFUSAL_MESSAGE });
    } else {
      for await (const delta of generateAnswerStream(message, chunks)) {
        fullAnswer += delta;
        send({ type: 'token', content: delta });
      }
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (!headersSent) {
      return res.status(500).json({ error: 'Internal error' });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Internal error during generation' })}\n\n`);
    res.end();
  } finally {
    if (headersSent) {
      const latencyMs = Date.now() - start;
      try {
        await query(
          `INSERT INTO chat_logs
             (query, response, retrieved_sources, latency_ms, was_refused)
           VALUES ($1, $2, $3, $4, $5)`,
          [message, fullAnswer, JSON.stringify(sources), latencyMs, wasRefused],
        );
      } catch (logErr) {
        console.error('Failed to log chat:', logErr);
      }
    }
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
