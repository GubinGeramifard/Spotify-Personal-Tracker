const express = require('express');
const axios = require('axios');
const { getUser, updateTokens, recordPlay, getTopTracked, getRecentHistory, getLastPlayedTrackId } = require('../db');
const authRouter = require('./auth');

const router = express.Router();

// Middleware: require auth via Bearer token
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const userId = authRouter.sessions.get(token);
  if (!userId) return res.status(401).json({ error: 'Invalid session' });

  req.userId = userId;
  next();
}

// Get a valid access token, refreshing if expired
async function getValidToken(userId) {
  const user = getUser.get(userId);
  if (!user) throw new Error('User not found');

  if (Date.now() < user.token_expires_at - 60000) {
    return user.access_token;
  }

  // Refresh the token
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    }
  );

  const { access_token, refresh_token, expires_in } = res.data;
  const token_expires_at = Date.now() + expires_in * 1000;

  updateTokens.run(
    access_token,
    refresh_token || user.refresh_token,
    token_expires_at,
    userId
  );

  return access_token;
}

// GET /api/now-playing
router.get('/now-playing', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.userId);
    const response = await axios.get(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status === 204 || !response.data || !response.data.item) {
      return res.json({ playing: false });
    }

    const item = response.data.item;
    const track = {
      id: item.id,
      name: item.name,
      artist: item.artists.map((a) => a.name).join(', '),
      album: item.album.name,
      image: item.album.images?.[0]?.url || '',
    };

    // Record play if it's a different track than the last recorded
    const lastTrackId = getLastPlayedTrackId(req.userId);
    if (lastTrackId !== track.id) {
      recordPlay(req.userId, track);
    }

    res.json({
      playing: true,
      is_playing: response.data.is_playing,
      track,
      progress_ms: response.data.progress_ms,
      duration_ms: item.duration_ms,
    });
  } catch (err) {
    console.error('Now playing error:', err.response?.data || err.message);
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Failed to fetch now playing' });
  }
});

// GET /api/top-tracks — locally tracked play counts
router.get('/top-tracks', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const tracks = getTopTracked(req.userId, limit);
  res.json(tracks);
});

// GET /api/top-tracks/spotify — from Spotify's API
router.get('/top-tracks/spotify', requireAuth, async (req, res) => {
  try {
    const token = await getValidToken(req.userId);
    const timeRange = req.query.time_range || 'medium_term';
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const tracks = response.data.items.map((item, i) => ({
      rank: i + 1,
      id: item.id,
      name: item.name,
      artist: item.artists.map((a) => a.name).join(', '),
      album: item.album.name,
      image: item.album.images?.[0]?.url || '',
    }));

    res.json(tracks);
  } catch (err) {
    console.error('Spotify top tracks error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

// GET /api/history
router.get('/history', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const history = getRecentHistory(req.userId, limit);
  res.json(history);
});

module.exports = router;
