import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../auth/AuthContext';

export default function Layout({ children }) {
  const [dark, setDark] = useState(true);
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  function toggleDark() { setDark((d) => !d); }

  return (
    <div className={dark ? 'App dark' : 'App'}>
      <header className='siteHeader'>
        <div className='container'>
          <div className='brand'>
            <Link to='/' className='brandLink' aria-label='Go to home'>
              <img src={logo} alt='Concertify logo' className='brandLogo' />
              <h1>Concertify</h1>
            </Link>
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
      <main className='container mainContent'>
        {children}
      </main>
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
                <li><Link to='/#events'>All events</Link></li>
                <li><Link to='/#upcoming'>Upcoming</Link></li>
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
    </div>
  );
}
