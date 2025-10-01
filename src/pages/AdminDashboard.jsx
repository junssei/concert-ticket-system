import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../config';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = React.useState('reservations');
  const [reservations, setReservations] = React.useState([]);
  const [payments, setPayments] = React.useState([]);

  function parseSeats(val) {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return JSON.parse(val);
      return [];
    } catch { return []; }
  }

  function getPayerEmail(p) {
    try {
      const raw = p?.raw_json;
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return obj?.payer?.email_address || '-';
    } catch { return '-'; }
  }

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rRes, pRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/reservations`),
          fetch(`${API_BASE_URL}/api/payments`),
        ]);
        if (!rRes.ok || !pRes.ok) throw new Error('API error');
        const [rRows, pRows] = await Promise.all([rRes.json(), pRes.json()]);
        if (!cancelled) {
          setReservations(Array.isArray(rRows) ? rRows : []);
          setPayments(Array.isArray(pRows) ? pRows : []);
        }
      } catch (_) {
        if (!cancelled) {
          setReservations(JSON.parse(localStorage.getItem('reservations') || '[]'));
          setPayments(JSON.parse(localStorage.getItem('payments') || '[]'));
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function updateReservation(id, nextStatus) {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/reservations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!resp.ok) throw new Error('API failed');
      // Re-load from API
      const rRes = await fetch(`${API_BASE_URL}/api/reservations`);
      if (rRes.ok) {
        const rows = await rRes.json();
        setReservations(Array.isArray(rows) ? rows : []);
        return;
      }
      throw new Error('Reload failed');
    } catch (_) {
      // Fallback localStorage update
      const list = JSON.parse(localStorage.getItem('reservations') || '[]');
      const updated = list.map((r) => (String(r.id) === String(id) ? { ...r, status: nextStatus, decidedAt: new Date().toISOString() } : r));
      localStorage.setItem('reservations', JSON.stringify(updated));
      setReservations(updated);
    }
  }

  return (
    <Layout>
      <div className='topBar'>
        <Link to='/' className='btnGhost'>← Back</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#6b7280' }}>{user?.email}</span>
          <button className='btn' onClick={logout}>Logout</button>
        </div>
      </div>

      <div className='card' style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab === 'reservations' ? 'primary' : ''}`} onClick={() => setTab('reservations')}>Reservations</button>
          <button className={`btn ${tab === 'payments' ? 'primary' : ''}`} onClick={() => setTab('payments')}>Payments</button>
          <button className={`btn ${tab === 'users' ? 'primary' : ''}`} onClick={() => setTab('users')}>Users</button>
        </div>

        {tab === 'reservations' && (
          <section>
            <h3 style={{ marginTop: 0 }}>Reservations</h3>
            {reservations.length === 0 ? (
              <EmptyTable headers={["Reservation ID", "Event", "User", "Seats", "Total", "Status", "Actions"]} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Reservation ID','Event','User','Seats','Total','Status','Actions'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding: '8px 6px' }}>{r.id}</td>
                        <td style={{ padding: '8px 6px' }}>{r.event_name}</td>
                        <td style={{ padding: '8px 6px' }}>{r.user_email || '-'}</td>
                        <td style={{ padding: '8px 6px' }}>{parseSeats(r.seats_json).join(', ')}</td>
                        <td style={{ padding: '8px 6px' }}>${r.total}</td>
                        <td style={{ padding: '8px 6px' }}>{r.status}</td>
                        <td style={{ padding: '8px 6px', display: 'flex', gap: 8 }}>
                          <button className='btn' onClick={() => updateReservation(r.id, 'rejected')}>Reject</button>
                          <button className='btn primary' onClick={() => updateReservation(r.id, 'approved')}>Approve</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'payments' && (
          <section>
            <h3 style={{ marginTop: 0 }}>Payments</h3>
            {payments.length === 0 ? (
              <EmptyTable headers={["Payment ID", "Provider", "Amount", "Status", "Payer", "Created At"]} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Payment ID','Provider','Amount','Status','Payer','Created At'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '8px 6px' }}>{p.id}</td>
                        <td style={{ padding: '8px 6px' }}>{p.provider}</td>
                        <td style={{ padding: '8px 6px' }}>${p.amount}</td>
                        <td style={{ padding: '8px 6px' }}>{p.status}</td>
                        <td style={{ padding: '8px 6px' }}>{getPayerEmail(p)}</td>
                        <td style={{ padding: '8px 6px' }}>{new Date(p.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'users' && (
          <section>
            <h3 style={{ marginTop: 0 }}>Users</h3>
            <EmptyTable headers={["User ID", "Email", "Role", "Created At", "Status"]} />
          </section>
        )}
      </div>
    </Layout>
  );
}

function EmptyTable({ headers }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={headers.length} style={{ padding: '16px 6px', color: '#6b7280' }}>
              No data yet. Connect your backend later to populate this table.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
