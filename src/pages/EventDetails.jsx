import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../auth/AuthContext';
import { TICKETMASTER_API_KEY } from '../config';

export default function EventDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(location.state?.event || null);
  const [loading, setLoading] = useState(!location.state?.event);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (event) return; // already have it from state
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

  function reserve() {
    const dest = `/reserve/${id}/seat`;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    navigate(dest, { state: { event } });
  }

  const name = event?.name || 'Event details';
  const date = event?.dates?.start?.localDate || 'TBA';
  const time = event?.dates?.start?.localTime || '';
  const venue = event?._embedded?.venues?.[0]?.name || 'Unknown venue';
  const venueObj = event?._embedded?.venues?.[0] || {};
  const address = [venueObj?.address?.line1, venueObj?.city?.name, venueObj?.state?.name || venueObj?.state?.stateCode, venueObj?.country?.name || venueObj?.country?.countryCode].filter(Boolean).join(', ');
  const status = event?.dates?.status?.code || 'unknown';
  const seatmap = event?.seatmap?.staticUrl || null;
  const price = event?.priceRanges?.[0] || null;
  const lineup = (event?._embedded?.attractions || []).map(a => a.name).filter(Boolean);
  const available = status === 'onsale' || status === 'rescheduled' || status === 'scheduled';
  const img = event?.images?.[0]?.url || null;
  const info = event?.info || event?.pleaseNote || '';

  return (
    <Layout>
      <div className='topBar'>
        <Link to='/' className='btnGhost'>← Back</Link>
      </div>
      {loading && <div className='loading'>Loading…</div>}
      {error && <div className='formError'>{error}</div>}
      {!loading && !error && (
        <article className='card' style={{ overflow: 'hidden' }}>
          {img && <img src={img} alt={name} className='cardImage' style={{ height: 240 }} />}
          <div className='cardBody'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className='cardTitle' style={{ fontSize: 22, marginBottom: 0 }}>{name}</h2>
              <span className={`badge ${available ? 'success' : (status === 'offsale' || status === 'canceled' ? 'error' : 'warn')}`}>{status.replace(/(^.|_.?)/g, s => s[0].toUpperCase() + s.slice(1))}</span>
            </div>
            <p className='cardMeta'>{date} {time ? `• ${time}` : ''}</p>
            <p className='cardVenue'>{venue}</p>
            {address && <p className='cardMeta'>{address}</p>}
            {lineup.length > 0 && <p className='cardMeta'><strong>Lineup:</strong> {lineup.join(', ')}</p>}
            {price && (
              <p className='cardMeta'>
                <strong>Price:</strong> {price.min}–{price.max} {price.currency}
              </p>
            )}
            {info && <p style={{ marginTop: 6 }}>{info}</p>}

            {seatmap && (
              <div style={{ marginTop: 12 }}>
                <img src={seatmap} alt='Seat map' style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
            )}

            <div className='cardActions' style={{ marginTop: 12 }}>
              <button className='btn' onClick={() => navigate(-1)}>Back</button>
              <button className='btn primary' onClick={reserve} disabled={!available}>{available ? 'Reserve' : 'Not Available'}</button>
              {event?.url && (
                <a className='btn' href={event.url} target='_blank' rel='noreferrer'>Other way to reserve (Official website)</a>
              )}
            </div>
          </div>
        </article>
      )}
    </Layout>
  );
}
