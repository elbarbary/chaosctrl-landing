-- ChaosCtrl waitlist storage (Cloudflare D1).
-- Run this once against the `chaosctrl_waitlist` database:
--   • Dashboard: D1 → chaosctrl_waitlist → Console → paste + Run, or
--   • CLI:       npx wrangler d1 execute chaosctrl_waitlist --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  source     TEXT
);
