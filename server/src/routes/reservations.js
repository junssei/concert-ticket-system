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

    // Basic validation
    if (!eventName || total == null) {
      return res.status(400).json({ error: 'eventName and total are required' });
    }

    const seatsJson = JSON.stringify(seats || []);
    try {
      const result = await query(
        'INSERT INTO reservations(event_id, event_name, user_email, seats_json, price_per_seat, total, status, payment_id, created_at) VALUES(?,?,?,?,?,?,?,?,NOW())',
        [eventId || null, eventName, userEmail || null, seatsJson, pricePerSeat || null, total, status || 'pending_approval', paymentId || null]
      );
      return res.status(201).json({ id: result.insertId });
    } catch (sqlErr) {
      console.error('[reservations] insert error:', sqlErr?.message, {
        eventId, eventName, userEmail, seatsCount: (seats || []).length, pricePerSeat, total, status, paymentId
      });
      return next(sqlErr);
    }
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
