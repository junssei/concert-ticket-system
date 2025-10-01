import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Example schema (to be created later):
// payments(id PK, provider, external_id, status, amount, currency, raw_json, created_at)

router.get('/', async (_req, res, next) => {
  try {
    const rows = await query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { provider, externalId, status, amount, currency, raw } = req.body;
    const result = await query(
      'INSERT INTO payments(provider, external_id, status, amount, currency, raw_json, created_at) VALUES(?,?,?,?,?,?,NOW())',
      [provider, externalId, status, amount, currency || 'USD', JSON.stringify(raw || {})]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    next(e);
  }
});

export default router;
