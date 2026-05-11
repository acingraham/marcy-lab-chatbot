import 'dotenv/config';
import express from 'express';
import { query } from './db.js';
import { router as apiRouter } from './routes/chat.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await query('SELECT 1 AS ok');
    res.json({ ok: rows[0].ok === 1, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use('/api', apiRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
