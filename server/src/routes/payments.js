import { Router } from 'express';
import { query } from '../db.js';
import { sendPaymentConfirmation } from '../services/notifications.js';

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

    // Send payment confirmation notification (fire-and-forget)
    // Only send if payment status indicates success
    const paymentStatus = String(status || '').toUpperCase();
    const isSuccessful = paymentStatus === 'COMPLETED' || paymentStatus === 'APPROVED' || paymentStatus === 'CAPTURED';
    
    if (isSuccessful) {
      (async () => {
        try {
          // Try to get user email from payment raw data (PayPal includes payer info)
          let userEmail = null;
          let userPhone = null;
          let eventName = null;

          if (raw) {
            userEmail = raw?.payer?.email_address || raw?.payer?.payer_info?.email || null;
            userPhone = raw?.payer?.phone?.phone_number?.national_number || null;
          }

          // Try to find associated reservation to get event name
          if (externalId) {
            try {
              const reservationRows = await query(
                'SELECT event_name, user_email FROM reservations WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1',
                [externalId]
              );
              if (reservationRows && reservationRows[0]) {
                eventName = reservationRows[0].event_name || eventName;
                userEmail = userEmail || reservationRows[0].user_email || null;
              }
            } catch (_) {
              // Ignore errors when looking up reservation
            }
          }

          if (userEmail) {
            await sendPaymentConfirmation({
              userEmail,
              userPhone,
              eventName,
              amount,
              currency: currency || 'USD',
              paymentId: externalId,
            });
          }
        } catch (error) {
          console.error('[payments] notification_error', error?.message);
        }
      })().catch(() => {});
    }
  } catch (e) {
    next(e);
  }
});

export default router;
