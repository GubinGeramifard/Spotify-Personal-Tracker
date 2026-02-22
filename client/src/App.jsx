import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LoginButton from './components/LoginButton';
import NowPlaying from './components/NowPlaying';
import TopTracks from './components/TopTracks';
import TrackHistory from './components/TrackHistory';

const API = import.meta.env.VITE_API_URL || '';

// Helper to make authenticated API calls
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('session_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth callback redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('session_token', token);
      window.history.replaceState({}, '', '/');
    }

    // Check if we have a valid session
    const savedToken = localStorage.getItem('session_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    authFetch(`${API}/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('session_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authFetch(`${API}/auth/logout`, { method: 'POST' });
    localStorage.removeItem('session_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginButton apiUrl={API} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="dashboard">
        <NowPlaying apiUrl={API} />
        <div className="bottom-grid">
          <TopTracks apiUrl={API} />
          <TrackHistory apiUrl={API} />
        </div>
      </div>
    </Layout>
  );
}
