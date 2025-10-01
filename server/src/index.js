import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool } from './db.js';
import reservationsRouter from './routes/reservations.js';
import paymentsRouter from './routes/payments.js';
import { migrate } from './migrate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*'}));
app.use(express.json());

app.get('/healthz', async (_req, res) => {
  let db = 'disabled';
  try {
    const pool = await getPool();
    if (pool) db = 'enabled';
  } catch (_) {}
  res.json({ ok: true, db });
});

app.use('/api/reservations', reservationsRouter);
app.use('/api/payments', paymentsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Ensure DB schema exists before starting the server
await migrate();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
