CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  caption TEXT,
  media_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  user_id TEXT,
  extra_json TEXT,
  likes_total INTEGER NOT NULL DEFAULT 0,
  shares_total INTEGER NOT NULL DEFAULT 0
);
