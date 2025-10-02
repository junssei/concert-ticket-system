import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { TICKETMASTER_API_KEY, API_BASE_URL } from '../config';

function generateSeats(rows = 10, cols = 14, seed = 1) {
  // Simple PRNG to keep seat availability stable per event
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${String.fromCharCode(65 + r)}${c + 1}`;
      const unavailable = rand() < 0.15; // 15% taken
      seats.push({ id, row: r, col: c, unavailable });
    }
  }
  return seats;
}

export default function SeatSelect() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState(location.state?.event || null);
  const [loading, setLoading] = useState(!location.state?.event);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reservedSet, setReservedSet] = useState(() => new Set());

  const seats = useMemo(() => generateSeats(10, 14, Number(String(id).replace(/\D/g, '')) || 1), [id]);

  // Fetch approved reservations for this event and build a set of reserved seat IDs
  useEffect(() => {
    let cancelled = false;
    async function loadReserved() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reservations`);
        if (!res.ok) throw new Error('Failed to load reservations');
        const rows = await res.json();
        const mine = (Array.isArray(rows) ? rows : [])
          .filter(r => String(r.event_id || '') === String(id) && String(r.status || '').toLowerCase() === 'approved');
        const set = new Set();
        for (const r of mine) {
          let seatsVal = r.seats_json;
          if (typeof seatsVal === 'string') {
            try { seatsVal = JSON.parse(seatsVal); } catch { seatsVal = []; }
          }
          if (Array.isArray(seatsVal)) {
            for (const s of seatsVal) set.add(String(s));
          }
        }
        if (!cancelled) setReservedSet(set);
      } catch (e) {
        if (!cancelled) {
          // Non-fatal: keep going with no reserved set
          setReservedSet(new Set());
        }
      }
    }
    loadReserved();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (event) return;
    let cancelled = false;
    async function fetchEvent() {
      try {
        setLoading(true);
        const url = `https://app.ticketmaster.com/discovery/v2/events/${id}.json?apikey=${TICKETMASTER_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load event');
        const data = await res.json();
        if (!cancelled) setEvent(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvent();
    return () => { cancelled = true; };
  }, [id, event]);

  const pricePerSeat = event?.priceRanges?.[0]?.min || 50;
  const total = (selected.length * pricePerSeat).toFixed(2);

  function toggleSeat(s) {
    if (s.unavailable || reservedSet.has(s.id)) return;
    setSelected((cur) => {
      const exists = cur.find((x) => x.id === s.id);
      if (exists) return cur.filter((x) => x.id !== s.id);
      if (cur.length >= 6) return cur; // limit selection to 6 seats
      return [...cur, s];
    });
  }

  function proceed() {
    if (selected.length === 0) return;
    const payload = {
      eventId: id,
      event: {
        id: event?.id,
        name: event?.name,
        date: event?.dates?.start?.localDate || 'TBA',
        time: event?.dates?.start?.localTime || '',
        venue: event?._embedded?.venues?.[0]?.name || 'Unknown venue',
        image: event?.images?.[0]?.url || null,
      },
      seats: selected.map((s) => s.id),
      pricePerSeat,
      total: Number(total),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('pendingCheckout', JSON.stringify(payload));
    navigate('/checkout');
  }

  return (
    <Layout>
      <div className='topBar'>
        <Link to={`/event/${id}`} state={{ event }} className='btnGhost'>← Back</Link>
      </div>
      {loading && <div className='loading'>Loading…</div>}
      {error && <div className='formError'>{error}</div>}
      {!loading && !error && (
        <article className='card' style={{ overflow: 'hidden' }}>
          <div className='cardBody'>
            <h2 className='cardTitle' style={{ fontSize: 22 }}>Select your seats</h2>
            <p className='cardMeta'>Pick up to 6 seats. Price per seat: ${pricePerSeat}</p>
            <div className='seatLegend'>
              <span><span className='seat sample available'/> Available</span>
              <span><span className='seat sample selected'/> Selected</span>
              <span><span className='seat sample unavailable'/> Unavailable</span>
            </div>
            <div className='seatGrid' role='grid' aria-label='Seat map'>
              {seats.map((s) => {
                const isReserved = reservedSet.has(s.id);
                const isSelected = selected.find((x) => x.id === s.id);
                const unavailable = s.unavailable || isReserved;
                const cls = unavailable ? 'unavailable' : (isSelected ? 'selected' : 'available');
                return (
                  <button
                    type='button'
                    key={s.id}
                    className={`seat ${cls}`}
                    onClick={() => toggleSeat(s)}
                    aria-label={`Seat ${s.id} ${cls}`}
                    disabled={unavailable}
                    title={s.id}
                  >
                    {s.id}
                  </button>
                );
              })}
            </div>
            <div className='cardActions' style={{ marginTop: 12 }}>
              <span className='cardMeta'>Selected: {selected.map(s => s.id).join(', ') || 'None'} | Total: ${total}</span>
              <button className='btn primary' onClick={proceed} disabled={selected.length === 0}>Proceed to Checkout</button>
            </div>
          </div>
        </article>
      )}
    </Layout>
  );
}
