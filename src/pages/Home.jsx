import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import '../App.css';
import logo from '../assets/logo.png';

export default function Home() {
  const [event, setEvent] = useState('')
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const inputRef = useRef(null);
  const heroRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  const fetchEvents = async (p = 0) => {
  const API_KEY = "jKhPvHMAsgPdNaNUGQ1iNTjXLjfGtyQj";
  const q = query ? `&keyword=${encodeURIComponent(query)}` : '';
  const url = `https://app.ticketmaster.com/discovery/v2/events?apikey=${API_KEY}&keyword=concert&locale=en-us&startDateTime=2025-10-01T02:32:00Z&endDateTime=2025-12-31T11:59:00Z&classificationName=concert&preferredCountry=us&page=${p}&size=${size}${q}`;
    try {
    setLoading(true);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Events not found');
    const data = await response.json();
    // Ticketmaster wraps events under _embedded.events
    const items = data?._embedded?.events || [];
    const pageInfo = data?.page || {};
    console.log('Fetched events', items, pageInfo);
    setEvents(items);
    setPage(pageInfo.number ?? p);
    setTotalPages(pageInfo.totalPages ?? 0);
    setLoading(false);
    } catch (err) {
    console.error(err);
    setEvents([]);
    setLoading(false);
    }
  }

  const fetchUpcoming = async () => {
    const API_KEY = "jKhPvHMAsgPdNaNUGQ1iNTjXLjfGtyQj";
    const url = `https://app.ticketmaster.com/discovery/v2/events?apikey=${API_KEY}&keyword=concert&locale=*&startDateTime=2025-10-01T02:32:00Z&page=0&classificationName=concert`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Upcoming events not found');
      const data = await response.json();
      const items = data?._embedded?.events || [];
      setUpcoming(items);
    } catch (err) {
      console.error(err);
      setUpcoming([]);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    fetchEvents(0);
    console.log('Search submitted:', query);
  }

  React.useEffect(() => {
    fetchEvents(0);
    fetchUpcoming();
  }, []);

  function gotoPage(p) {
    if (p < 0 || (totalPages && p >= totalPages)) return;
    fetchEvents(p);
  }

  function toggleDark() {
    setDark((d) => !d);
  }

  function viewEvent(ev) {
    const id = ev?.id || 'unknown';
    navigate(`/event/${id}`, { state: { event: ev } });
  }

  // Reservation flow with auth gate
  function startReservation(ev) {
    setEvent(ev);
    const id = ev?.id || 'unknown';
    const dest = `/reserve/${id}/seat`;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    navigate(dest, { state: { event: ev } });
  }

  function goHome(e) {
    if (e && e.preventDefault) e.preventDefault();
    setQuery('');
    fetchEvents(0);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err) { /* ignore */ }
  }

  const scrollByHero = (dir = 1) => {
    const el = heroRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  return (
    <div className={dark ? 'App dark' : 'App'}>
      <header className='siteHeader'>
        <div className='container'>
          <div className='brand'>
            <a href='/' className='brandLink' onClick={goHome} aria-label='Go to home'>
              <img src={logo} alt='Concertify logo' className='brandLogo' />
              <h1>Concertify</h1>
            </a>
          </div>
          <div className='headerActions'>
            <label className='darkToggle'>
              <input type='checkbox' checked={dark} onChange={toggleDark} />
              <span>Dark</span>
            </label>
            <nav style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {isAuthenticated ? (
                <>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>{user?.email}</span>
                  {isAdmin && (
                    <Link className='btn' to='/admin'>Admin</Link>
                  )}
                  <button className='btn' onClick={logout}>Logout</button>
                </>
              ) : (
                <>
                  <Link className='btn' to='/login'>Login</Link>
                  <Link className='btn primary' to='/register'>Register</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className='container'>

      {/* Hero: upcoming concerts strip */}
      <section className='hero' id='upcoming'>
        <div className='heroHeader'>
          <h2>Upcoming concerts</h2>
        </div>
        <div className='heroTrack' ref={heroRef}>
          {upcoming.slice(0, 12).map((ev) => {
            const id = ev.id;
            const name = ev.name;
            const date = ev.dates?.start?.localDate || 'TBA';
            const venue = ev._embedded?.venues?.[0]?.name || 'Unknown venue';
            const img = ev.images?.[0]?.url || null;
            const status = ev?.dates?.status?.code || 'unknown';
            const statusClass = (status === 'onsale' || status === 'rescheduled' || status === 'scheduled')
              ? 'success'
              : ((status === 'offsale' || status === 'canceled') ? 'error' : 'warn');
            const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

            return (
              <div key={id} className='heroItem' role='group' aria-label={name}>
                {img ? (
                  <div className='heroImage' style={{ backgroundImage: `url(${img})` }} />
                ) : (
                  <div className='heroImage placeholder' />
                )}
                <div className='heroOverlay'>
                  <h3 className='heroTitle'>{name}</h3>
                  <p className='heroMeta'>{date} • {venue}</p>
                  <span className={`badge ${statusClass}`}>{statusText}</span>
                  <div className='heroActions'>
                    <button className='btn primary' onClick={() => viewEvent(ev)} aria-label={`View ${name}`}>View</button>
                    <button className='btn' onClick={() => startReservation(ev)} aria-label={`Reserve ${name}`}>Reserve</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className='eventsHeader' id='events'>
        <h2>All events</h2>
        <form className='searchForm' role='search' onSubmit={onSubmit} aria-label='Search concerts'>
          <label htmlFor='search-input' className='sr-only'>Search for concerts</label>
          <div className='searchInput'>
            <span className='icon' aria-hidden='true'>
              <ion-icon name="search-outline"></ion-icon>
            </span>
            <input
              id='search-input'
              ref={inputRef}
              className='input'
              data-theme={dark ? 'dark' : 'light'}
              type='search'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search for concerts, artists, or venues'
              aria-label='Search for concerts'
            />
          </div>
          <button className='submitBtn' type='submit' aria-label='Submit search'>Search</button>
        </form>
      </section>
      <div className='eventCards'>
        <div className='cards'>
          {events.length === 0 ? (
            <div className='empty'>No events to show. Try a different search.</div>
          ) : (
            events.map((ev) => {
              const id = ev.id;
              const name = ev.name;
              const date = ev.dates?.start?.localDate || 'TBA';
              const time = ev.dates?.start?.localTime || '';
              const venue = ev._embedded?.venues?.[0]?.name || 'Unknown venue';
              const img = ev.images?.[0]?.url || null;

              return (
                <article key={id} className='card' aria-labelledby={`title-${id}`}>
                  {img && <img src={img} alt={name} className='cardImage' />}
                  <div className='cardBody'>
                    <h3 id={`title-${id}`} className='cardTitle'>{name}</h3>
                    <p className='cardMeta'>{date} {time ? `• ${time}` : ''}</p>
                    <p className='cardVenue'>{venue}</p>
                    <div className='cardActions'>
                      <button className='btn primary' onClick={() => viewEvent(ev)} aria-label={`View ${name}`}>View</button>
                      <button className='btn' onClick={() => startReservation(ev)} aria-label={`Reserve ${name}`}>Reserve</button>
                    </div>
                </div>
              </article>
            )
          })
        )}
        </div>
        <div className='pagination'>
          <button className='pageBtn' onClick={() => gotoPage(page - 1)} disabled={page <= 0}>Prev</button>
          <div className='pageInfo'>Page {page + 1} {totalPages ? `of ${totalPages}` : ''}</div>
          <button className='pageBtn' onClick={() => gotoPage(page + 1)} disabled={totalPages ? page + 1 >= totalPages : false}>Next</button>
        </div>
        {loading && <div className='loading'>Loading…</div>}
      </div>
        <footer className='siteFooter'>
          <div className='footerTop container'>
            <div className='footerBrand'>
              <div className='footerBrandRow'>
                <img src={logo} alt='Concertify logo' className='footerLogo' />
                <h3>Concertify</h3>
              </div>
              <p>Discover live music events around the world.</p>
            </div>
            <nav className='footerLinks' aria-label='Footer navigation'>
              <div className='footerCol'>
                <h4>Explore</h4>
                <ul>
                  <li><a href='#events'>All events</a></li>
                  <li><a href='#upcoming'>Upcoming</a></li>
                  <li><a href='#artists'>Top artists</a></li>
                </ul>
              </div>
              <div className='footerCol'>
                <h4>Company</h4>
                <ul>
                  <li><a href='#about'>About</a></li>
                  <li><a href='#contact'>Contact</a></li>
                  <li><a href='#careers'>Careers</a></li>
                </ul>
              </div>
              <div className='footerCol'>
                <h4>Follow</h4>
                <ul className='social'>
                  <li><a href='#twitter'>Twitter</a></li>
                  <li><a href='#instagram'>Instagram</a></li>
                  <li><a href='#facebook'>Facebook</a></li>
                </ul>
              </div>
            </nav>
          </div>
          <div className='footerBottom'>
            <div className='container'>
              <span>© {new Date().getFullYear()} Concertify</span>
              <span className='love'>Built with ❤️ for live music fans</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
