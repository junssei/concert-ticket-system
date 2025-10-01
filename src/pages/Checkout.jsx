import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { PAYPAL_CLIENT_ID, API_BASE_URL } from '../config';
import { useAuth } from '../auth/AuthContext';

export default function Checkout() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState(null);
  const buttonsRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const raw = localStorage.getItem('pendingCheckout');
    if (raw) setOrder(JSON.parse(raw));
  }, []);

  // Load PayPal SDK script dynamically
  useEffect(() => {
    if (!order) return;
    if (window.paypal) { setSdkReady(true); return; }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError('Failed to load PayPal SDK');
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch (_) {} };
  }, [order]);
  const { event, seats = [], pricePerSeat, total } = order || {};

  useEffect(() => {
    if (!sdkReady || !buttonsRef.current || !window.paypal) return;
    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{ amount: { value: String(total) } }],
          intent: 'CAPTURE'
        });
      },
      onApprove: async (data, actions) => {
        try {
          const details = await actions.order.capture();
          const paymentId = details.id;
          // Try to persist via backend API
          let apiOk = false;
          try {
            const payResp = await fetch(`${API_BASE_URL}/api/payments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'paypal',
                externalId: paymentId,
                status: details.status,
                amount: total,
                currency: 'USD',
                raw: details,
              })
            });
            if (!payResp.ok) throw new Error('Payment API failed');

            const resvResp = await fetch(`${API_BASE_URL}/api/reservations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId: event?.id,
                eventName: event?.name,
                userEmail: user?.email || null,
                seats,
                pricePerSeat,
                total,
                status: 'pending_approval',
                paymentId: paymentId,
              })
            });
            if (!resvResp.ok) throw new Error('Reservation API failed');
            apiOk = true;
          } catch (_) {
            // Fallback to localStorage
            const payments = JSON.parse(localStorage.getItem('payments') || '[]');
            payments.unshift({ id: paymentId, provider: 'paypal', status: details.status, amount: total, currency: 'USD', raw: details, createdAt: new Date().toISOString() });
            localStorage.setItem('payments', JSON.stringify(payments));
            const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            reservations.unshift({ id: `R-${Date.now()}`, event, seats, pricePerSeat, total, method: 'paypal', status: 'pending_approval', createdAt: new Date().toISOString(), paymentId });
            localStorage.setItem('reservations', JSON.stringify(reservations));
          }
          localStorage.removeItem('pendingCheckout');
          alert('Payment successful. Your reservation is pending admin approval.');
          navigate('/', { replace: true });
        } catch (e) {
          setError(e?.message || 'Payment capture failed');
        }
      },
      onError: (err) => {
        setError('PayPal error. Please try again.');
        console.error(err);
      },
      onCancel: () => {
        // optional: handle cancel
      }
    });
    try {
      buttons.render(buttonsRef.current);
    } catch (e) {
      setError('Unable to render PayPal Buttons');
    }
    return () => { try { buttons.close(); } catch (_) {} };
  }, [sdkReady, total, event, seats, pricePerSeat, navigate]);

  function simulateSuccess() {
    const resv = {
      id: `R-${Date.now()}`,
      event,
      seats,
      pricePerSeat,
      total,
      method: 'paypal-sandbox',
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };
    const list = JSON.parse(localStorage.getItem('reservations') || '[]');
    list.unshift(resv);
    localStorage.setItem('reservations', JSON.stringify(list));
    localStorage.removeItem('pendingCheckout');
    alert('Payment successful. Your reservation is pending admin approval.');
    navigate('/', { replace: true });
  }

  function cancel() {
    navigate(-1);
  }

  const sandboxConfigured = PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'YOUR_PAYPAL_SANDBOX_CLIENT_ID';

  if (!order) {
    return (
      <Layout>
        <div className='topBar'>
          <Link to='/' className='btnGhost'>← Back</Link>
        </div>
        <article className='card'><div className='cardBody'>
          <h2 className='cardTitle'>No order to checkout</h2>
          <p className='cardMeta'>Please select seats first.</p>
          <div className='cardActions'>
            <Link className='btn primary' to='/'>Go Home</Link>
          </div>
        </div></article>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='topBar'>
        <Link to='/' className='btnGhost'>← Back</Link>
      </div>
      <article className='card'>
        <div className='cardBody'>
          <h2 className='cardTitle'>Checkout</h2>
          <div className='cardMeta'>
            <div><strong>Event:</strong> {event?.name}</div>
            <div><strong>Seats:</strong> {seats.join(', ')}</div>
            <div><strong>Price per seat:</strong> ${pricePerSeat}</div>
            <div><strong>Total:</strong> ${total}</div>
          </div>

          {error && <div className='formError' style={{ marginTop: 12 }}>{error}</div>}
          <div style={{ marginTop: 12 }}>
            <div ref={buttonsRef} />
          </div>
          <div className='cardActions' style={{ marginTop: 12 }}>
            <button className='btn' onClick={cancel}>Cancel</button>
          </div>
        </div>
      </article>
    </Layout>
  );
}
