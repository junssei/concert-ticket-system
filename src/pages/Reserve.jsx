import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Reserve() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const event = location.state?.event || null;

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => event?.name || `Event #${id}`, [event, id]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Placeholder success (replace with API call later)
      alert(`Reserved ${quantity} ticket(s) for ${title}.`);
      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className='topBar'>
        <Link to='/' className='btnGhost'>← Back</Link>
      </div>
      <article className='card' style={{ overflow: 'hidden' }}>
        <div className='cardBody'>
          <h2 className='cardTitle' style={{ fontSize: 22 }}>Reserve Tickets</h2>
          <div className='cardMeta' style={{ marginBottom: 8 }}>
            {event ? (
              <>
                <div><strong>Event:</strong> {event.name}</div>
                <div><strong>Date:</strong> {event.dates?.start?.localDate || 'TBA'} {event.dates?.start?.localTime ? `• ${event.dates.start.localTime}` : ''}</div>
                <div><strong>Venue:</strong> {event._embedded?.venues?.[0]?.name || 'Unknown venue'}</div>
              </>
            ) : (
              <div>Proceeding to reserve for event ID: {id}</div>
            )}
          </div>
          <form onSubmit={onSubmit} className='authForm'>
            <label className='formGroup'>
              <span className='formLabel'>Full Name</span>
              <input className='input' type='text' value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className='formGroup'>
              <span className='formLabel'>Quantity</span>
              <input className='input' type='number' min={1} max={10} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || '1', 10))} />
            </label>
            <label className='formGroup'>
              <span className='formLabel'>Notes (optional)</span>
              <textarea className='input' rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className='cardActions'>
              <button type='button' className='btn' onClick={() => navigate(-1)}>Cancel</button>
              <button className='btn primary' type='submit' disabled={submitting}>{submitting ? 'Reserving…' : 'Confirm Reservation'}</button>
            </div>
          </form>
        </div>
      </article>
    </Layout>
  );
}
