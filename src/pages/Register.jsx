import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const redirect = params.get('redirect') || '/';

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await register({ email, password, name, role });
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage heroDark">
      <div className="container authWrap">
        <div className="authTopAction">
          <Link className="btnGhost" to="/">← Home</Link>
          <Link className="authLink" to={`/login?redirect=${encodeURIComponent(redirect)}`}>Login →</Link>
        </div>
        <div className="authPanel">
          <div className="authHead">
            <h2 className="authHeroTitle">Here you can Register</h2>
            <p className="authHeroSubtitle">Let's join us :)</p>
          </div>
          {error && <div className="formError">{error}</div>}
          <form onSubmit={onSubmit} className="authForm">
            <label className="formGroup">
              <span className="formLabel">Name</span>
              <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="formGroup">
              <span className="formLabel">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="formGroup">
              <span className="formLabel">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label className="formGroup">
              <span className="formLabel">Role</span>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button className="btnGradient full" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'REGISTER'}</button>
            <div className="authMutedLink">
              <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Already have an account?</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
