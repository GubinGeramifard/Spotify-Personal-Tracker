const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'spotify-tracker.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    spotify_id TEXT PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spotify_user_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT,
    album_image_url TEXT,
    played_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (spotify_user_id) REFERENCES users(spotify_id)
  );

  CREATE TABLE IF NOT EXISTS play_counts (
    spotify_user_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    track_name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_image_url TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (spotify_user_id, track_id),
    FOREIGN KEY (spotify_user_id) REFERENCES users(spotify_id)
  );

  CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(spotify_user_id);
  CREATE INDEX IF NOT EXISTS idx_history_played ON listening_history(played_at);
`);

const upsertUser = db.prepare(`
  INSERT INTO users (spotify_id, display_name, avatar_url, access_token, refresh_token, token_expires_at)
  VALUES (@spotify_id, @display_name, @avatar_url, @access_token, @refresh_token, @token_expires_at)
  ON CONFLICT(spotify_id) DO UPDATE SET
    display_name = @display_name,
    avatar_url = @avatar_url,
    access_token = @access_token,
    refresh_token = @refresh_token,
    token_expires_at = @token_expires_at
`);

const getUser = db.prepare('SELECT * FROM users WHERE spotify_id = ?');

const updateTokens = db.prepare(`
  UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE spotify_id = ?
`);

const insertHistory = db.prepare(`
  INSERT INTO listening_history (spotify_user_id, track_id, track_name, artist_name, album_name, album_image_url)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const upsertPlayCount = db.prepare(`
  INSERT INTO play_counts (spotify_user_id, track_id, track_name, artist_name, album_image_url, count)
  VALUES (?, ?, ?, ?, ?, 1)
  ON CONFLICT(spotify_user_id, track_id) DO UPDATE SET
    count = count + 1,
    track_name = excluded.track_name,
    artist_name = excluded.artist_name,
    album_image_url = excluded.album_image_url
`);

const getTopTracked = db.prepare(`
  SELECT track_id, track_name, artist_name, album_image_url, count
  FROM play_counts
  WHERE spotify_user_id = ?
  ORDER BY count DESC
  LIMIT ?
`);

const getRecentHistory = db.prepare(`
  SELECT track_id, track_name, artist_name, album_name, album_image_url, played_at
  FROM listening_history
  WHERE spotify_user_id = ?
  ORDER BY played_at DESC
  LIMIT ?
`);

const getLastPlayed = db.prepare(`
  SELECT track_id FROM listening_history
  WHERE spotify_user_id = ?
  ORDER BY played_at DESC
  LIMIT 1
`);

module.exports = {
  db,
  upsertUser,
  getUser,
  updateTokens,
  recordPlay(userId, track) {
    insertHistory.run(userId, track.id, track.name, track.artist, track.album, track.image);
    upsertPlayCount.run(userId, track.id, track.name, track.artist, track.image);
  },
  getTopTracked(userId, limit = 50) {
    return getTopTracked.all(userId, limit);
  },
  getRecentHistory(userId, limit = 50) {
    return getRecentHistory.all(userId, limit);
  },
  getLastPlayedTrackId(userId) {
    const row = getLastPlayed.get(userId);
    return row ? row.track_id : null;
  },
};
