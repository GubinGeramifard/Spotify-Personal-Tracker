import { useState, useEffect } from 'react';
import { authFetch } from '../App';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TrackHistory({ apiUrl }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = () => {
      authFetch(`${apiUrl}/api/history`)
        .then((r) => r.ok ? r.json() : [])
        .then(setHistory)
        .catch(() => setHistory([]));
    };

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [apiUrl]);

  return (
    <div className="panel history-panel">
      <div className="panel-header">
        <h3>Listening History</h3>
      </div>
      <div className="panel-body">
        {history.length === 0 ? (
          <p className="empty-msg">No listening history yet.</p>
        ) : (
          <ul className="track-list">
            {history.map((t, i) => (
              <li key={`${t.track_id}-${t.played_at}-${i}`} className="track-item">
                {t.album_image_url && (
                  <img className="track-thumb" src={t.album_image_url} alt="" />
                )}
                <div className="track-info">
                  <span className="track-name">{t.track_name}</span>
                  <span className="track-artist">{t.artist_name}</span>
                </div>
                <span className="track-time">{timeAgo(t.played_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
