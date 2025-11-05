import { Router } from 'express';
import { query } from '../db.js';
import fetch from 'node-fetch';
import { sendReservationApproval } from '../services/notifications.js';

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
    const id = req.params.id;

    // Load previous state to detect transitions
    const rows = await query('SELECT id, status, event_id, event_name, user_email, seats_json, total FROM reservations WHERE id=?', [id]);
    const prev = rows && rows[0] ? rows[0] : null;

    await query('UPDATE reservations SET status=? WHERE id=?', [status, id]);
    res.json({ ok: true });

    // Fire-and-forget Discord notification when transitioning to approved or rejected
    const curStatus = String(status || '').toLowerCase();
    const prevStatus = String(prev?.status || '').toLowerCase();
    const nowApproved = curStatus === 'approved';
    const wasApproved = prevStatus === 'approved';
    const nowRejected = curStatus === 'rejected';
    const wasRejected = prevStatus === 'rejected';
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

    const shouldNotify = discordWebhook && ((nowApproved && !wasApproved) || (nowRejected && !wasRejected));

    // Send NotificationAPI notification when reservation is approved
    if (nowApproved && !wasApproved && prev) {
      (async () => {
        try {
          // Parse seats
          let seats = prev?.seats_json;
          if (typeof seats === 'string') {
            try { seats = JSON.parse(seats); } catch { seats = []; }
          }

          // Try to get user phone from payment data if available
          let userPhone = null;
          if (prev?.payment_id) {
            try {
              const paymentRows = await query(
                'SELECT raw_json FROM payments WHERE external_id = ? LIMIT 1',
                [prev.payment_id]
              );
              if (paymentRows && paymentRows[0] && paymentRows[0].raw_json) {
                const rawJson = typeof paymentRows[0].raw_json === 'string' 
                  ? JSON.parse(paymentRows[0].raw_json) 
                  : paymentRows[0].raw_json;
                userPhone = rawJson?.payer?.phone?.phone_number?.national_number || null;
              }
            } catch (_) {
              // Ignore errors when looking up payment
            }
          }

          await sendReservationApproval({
            userEmail: prev.user_email,
            userPhone,
            eventName: prev.event_name,
            reservationId: id,
            seats,
            total: prev.total,
            currency: 'USD', // Could be retrieved from payment if needed
          });
        } catch (error) {
          console.error('[reservations] notification_error', error?.message);
        }
      })().catch(() => {});
    }

    if (shouldNotify) {
      (async () => {
        // Parse seats
        let seats = prev?.seats_json;
        if (typeof seats === 'string') {
          try { seats = JSON.parse(seats); } catch {_ => (seats = []);} // fallback
        }
        const seatList = Array.isArray(seats) ? seats.join(', ') : '';
        const total = prev?.total != null ? String(prev.total) : '';
        const eventName = prev?.event_name || 'Unknown Event';
        const userEmail = prev?.user_email || 'unknown';

        const isApproved = nowApproved && !wasApproved;
        const isRejected = nowRejected && !wasRejected;
        const content = isApproved
          ? `✅ Reservation approved (#${id})`
          : `❌ Reservation rejected (#${id})`;
        const title = isApproved ? 'Reservation Approved' : 'Reservation Rejected';
        const color = isApproved ? 0x22c55e /* green-500 */ : 0xef4444 /* red-500 */;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const logoUrl = process.env.DISCORD_LOGO_URL || `${baseUrl}/public/logo.png`;
        const embeds = [
          {
            title,
            description: eventName,
            color,
            author: { name: 'Concertify', icon_url: logoUrl },
            thumbnail: { url: logoUrl },
            fields: [
              ...(userEmail ? [{ name: 'User', value: userEmail, inline: true }] : []),
              ...(total ? [{ name: 'Total', value: total, inline: true }] : []),
              ...(seatList ? [{ name: 'Seats', value: seatList, inline: false }] : [])
            ],
            footer: { text: `Reservation #${id} • Concertify` },
            timestamp: new Date().toISOString()
          }
        ];
        try {
          const resp = await fetch(discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, embeds })
          });
          if (!resp.ok && resp.status !== 204) {
            // eslint-disable-next-line no-console
            console.error('[reservations] discord_failed', resp.status, await resp.text());
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[reservations] discord_error', e?.message);
        }
      })().catch(() => {});
    }
  } catch (e) {
    next(e);
  }
});

export default router;
