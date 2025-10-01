import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_BASE_URL } from '../config';
import { useAuth } from '../auth/AuthContext';

function parseSeats(val) {
  try {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return JSON.parse(val);
    return [];
  } catch { return []; }
}

function statusClass(code) {
  if (!code) return 'warn';
  const c = String(code).toLowerCase();
  if (c === 'approved') return 'success';
  if (c === 'rejected' || c === 'canceled') return 'error';
  return 'warn';
}

export default function MyReservations() {
  const { user } = useAuth();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.email) { setItems([]); setLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/api/reservations`);
        if (!res.ok) throw new Error('Failed to load reservations');
        const rows = await res.json();
        const mine = (Array.isArray(rows) ? rows : []).filter(r => String(r.user_email || '').toLowerCase() === String(user.email).toLowerCase());
        // Sort by created_at desc if present
        mine.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (!cancelled) setItems(mine);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Error loading');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.email]);

  return (
    <Layout>
      <div className='topBar'>
        <Link to='/' className='btnGhost'>← Back</Link>
      </div>
      <article className='card'>
        <div className='cardBody'>
          <h2 className='cardTitle'>My Reservations</h2>
          {loading && <div className='cardMeta'>Loading…</div>}
          {error && <div className='formError' style={{ marginTop: 8 }}>{error}</div>}
          {!loading && !error && (
            items.length === 0 ? (
              <div className='empty'>No reservations yet.</div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['ID','Event','Seats','Total','Status','Created At'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td style={{ padding: '8px 6px' }}>{r.id}</td>
                        <td style={{ padding: '8px 6px' }}>{r.event_name || '-'}</td>
                        <td style={{ padding: '8px 6px' }}>{parseSeats(r.seats_json).join(', ')}</td>
                        <td style={{ padding: '8px 6px' }}>${r.total}</td>
                        <td style={{ padding: '8px 6px' }}>
                          <span className={`badge ${statusClass(r.status)}`}>{String(r.status || 'pending').replace(/_/g, ' ')}</span>
                        </td>
                        <td style={{ padding: '8px 6px' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </article>
    </Layout>
  );
}
