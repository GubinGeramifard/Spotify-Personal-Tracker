const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { upsertUser, getUser } = require('../db');

const router = express.Router();

const SCOPES = 'user-read-currently-playing user-top-read user-read-recently-played';

// In-memory session store: token -> spotify_user_id
const sessions = new Map();

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    show_dialog: 'true',
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=${error}`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
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

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const token_expires_at = Date.now() + expires_in * 1000;

    // Get user profile
    const profileRes = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data;
    const avatar_url = profile.images?.[0]?.url || '';

    // Store user in DB
    upsertUser.run({
      spotify_id: profile.id,
      display_name: profile.display_name || profile.id,
      avatar_url,
      access_token,
      refresh_token,
      token_expires_at,
    });

    // Create a session token and store it
    const sessionToken = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionToken, profile.id);

    // Redirect to frontend with token in URL
    res.redirect(`${process.env.FRONTEND_URL}?token=${sessionToken}`);
  } catch (err) {
    console.error('Auth callback error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const userId = sessions.get(token);
  if (!userId) return res.status(401).json({ error: 'Invalid session' });

  const user = getUser.get(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({
    spotify_id: user.spotify_id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
  });
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// Export sessions so tracks.js can use it
router.sessions = sessions;

module.exports = router;
