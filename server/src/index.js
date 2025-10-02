import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { getPool } from './db.js';
import reservationsRouter from './routes/reservations.js';
import paymentsRouter from './routes/payments.js';
import { migrate } from './migrate.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*'}));
// PayPal webhook must read RAW body for verification; register before JSON parser
app.post('/api/paypal/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const event = JSON.parse(raw.toString('utf8'));
    // Acknowledge immediately so PayPal doesn't retry
    res.status(200).json({ ok: true });

    // Process in background (verify + forward)
    (async () => {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
      const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
      const base = env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const skipVerify = String(process.env.PAYPAL_SKIP_VERIFY || '0') === '1';

      // Collect verification headers
      const transmissionId = req.headers['paypal-transmission-id'];
      const transmissionTime = req.headers['paypal-transmission-time'];
      const certUrl = req.headers['paypal-cert-url'];
      const authAlgo = req.headers['paypal-auth-algo'];
      const transmissionSig = req.headers['paypal-transmission-sig'];

      // Get OAuth token
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      if (!tokenRes.ok) {
        console.error('[paypal_webhook] oauth_failed', await tokenRes.text());
        return;
      }
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      let ok = skipVerify;
      let verifyJson = {};
      if (!skipVerify) {
        // Verify webhook signature
        const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transmission_id: transmissionId,
            transmission_time: transmissionTime,
            cert_url: certUrl,
            auth_algo: authAlgo,
            transmission_sig: transmissionSig,
            webhook_id: webhookId,
            webhook_event: event
          })
        });
        verifyJson = await verifyRes.json().catch(() => ({}));
        ok = verifyRes.ok && verifyJson.verification_status === 'SUCCESS';
        if (!ok) {
          console.error('[paypal_webhook] verification_failed', verifyJson);
          return;
        }
      }

      // Forward to Discord (best-effort)
      if (discordWebhook) {
        const amount = event?.resource?.amount?.value || event?.resource?.seller_receivable_breakdown?.gross_amount?.value || '';
        const currency = event?.resource?.amount?.currency_code || event?.resource?.seller_receivable_breakdown?.gross_amount?.currency_code || '';
        const payer = event?.resource?.payer?.email_address || event?.resource?.payer?.payer_info?.email || 'unknown';
        const content = `PayPal event: ${event?.event_type || 'UNKNOWN'}`;
        const embeds = [
          {
            title: event?.event_type || 'PayPal Webhook',
            description: event?.summary || '',
            fields: [
              ...(amount ? [{ name: 'Amount', value: `${amount} ${currency}`, inline: true }] : []),
              ...(payer ? [{ name: 'Payer', value: String(payer), inline: true }] : []),
              { name: 'ID', value: String(event?.id || 'N/A'), inline: false }
            ],
            timestamp: event?.create_time || new Date().toISOString()
          }
        ];
        try {
          const resp = await fetch(discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, embeds })
          });
          if (!resp.ok && resp.status !== 204) {
            console.error('[paypal_webhook] discord_failed', resp.status, await resp.text());
          }
        } catch (_) { /* ignore */ }
      }
    })().catch(() => {});
  } catch (_) {
    // Malformed JSON; still acknowledge to avoid retries
    try { res.status(200).json({ ok: true }); } catch {}
  }
});

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
