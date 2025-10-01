import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Example schema (to be created later):
// reservations(id PK, event_id, event_name, user_email, seats_json, price_per_seat, total, status, payment_id, created_at)

router.get('/', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM reservations ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { eventId, eventName, userEmail, seats, pricePerSeat, total, status, paymentId } = req.body;
    const result = await query(
      'INSERT INTO reservations(event_id, event_name, user_email, seats_json, price_per_seat, total, status, payment_id, created_at) VALUES(?,?,?,?,?,?,?,?,NOW())',
      [eventId, eventName, userEmail, JSON.stringify(seats || []), pricePerSeat, total, status || 'pending_approval', paymentId || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    await query('UPDATE reservations SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
