import { useState, useEffect } from 'react';
import { authFetch } from '../App';

export default function TopTracks({ apiUrl }) {
  const [tracks, setTracks] = useState([]);
  const [tab, setTab] = useState('tracked');

  useEffect(() => {
    const url = tab === 'tracked'
      ? `${apiUrl}/api/top-tracks`
      : `${apiUrl}/api/top-tracks/spotify`;

    authFetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [apiUrl, tab]);

  return (
    <div className="panel top-tracks-panel">
      <div className="panel-header">
        <h3>Top Tracks</h3>
        <div className="tab-group">
          <button
            className={`tab ${tab === 'tracked' ? 'active' : ''}`}
            onClick={() => setTab('tracked')}
          >
            My Counts
          </button>
          <button
            className={`tab ${tab === 'spotify' ? 'active' : ''}`}
            onClick={() => setTab('spotify')}
          >
            Spotify Top
          </button>
        </div>
      </div>
      <div className="panel-body">
        {tracks.length === 0 ? (
          <p className="empty-msg">
            {tab === 'tracked'
              ? 'No tracks recorded yet. Start listening!'
              : 'Could not load Spotify top tracks.'}
          </p>
        ) : (
          <ul className="track-list">
            {tracks.map((t, i) => (
              <li key={t.track_id || t.id} className="track-item">
                <span className={`track-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                {(t.album_image_url || t.image) && (
                  <img className="track-thumb" src={t.album_image_url || t.image} alt="" />
                )}
                <div className="track-info">
                  <span className="track-name">{t.track_name || t.name}</span>
                  <span className="track-artist">{t.artist_name || t.artist}</span>
                </div>
                {t.count != null && (
                  <span className="track-count">
                    {t.count} {t.count === 1 ? 'play' : 'plays'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
