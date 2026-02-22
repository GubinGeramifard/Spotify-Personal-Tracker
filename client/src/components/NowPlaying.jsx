import { useState, useEffect } from 'react';
import { authFetch } from '../App';

export default function NowPlaying({ apiUrl }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await authFetch(`${apiUrl}/api/now-playing`);
        if (res.ok && active) setData(await res.json());
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => { active = false; clearInterval(id); };
  }, [apiUrl]);

  if (!data || !data.playing) {
    return (
      <div className="now-playing-card empty">
        <div className="np-placeholder">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="#535353">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <p>Nothing playing right now</p>
          <span>Play something on Spotify to see it here</span>
        </div>
      </div>
    );
  }

  const progress = data.duration_ms ? (data.progress_ms / data.duration_ms) * 100 : 0;
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="now-playing-card">
      <div className="np-album-art">
        <img src={data.track.image} alt={data.track.album} />
        {data.is_playing && <div className="np-playing-indicator"><span /><span /><span /></div>}
      </div>
      <div className="np-info">
        <span className="np-label">{data.is_playing ? 'NOW PLAYING' : 'PAUSED'}</span>
        <h2 className="np-title">{data.track.name}</h2>
        <p className="np-artist">{data.track.artist}</p>
        <p className="np-album">{data.track.album}</p>
        <div className="np-progress">
          <div className="np-progress-bar">
            <div className="np-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="np-times">
            <span>{formatTime(data.progress_ms)}</span>
            <span>{formatTime(data.duration_ms)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
