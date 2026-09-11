import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { ROOT } from './paths.js';

const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'kylastusgraafik.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'field',   -- 'admin' | 'field'
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT,
  lat        REAL,
  lng        REAL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  store_id       TEXT NOT NULL REFERENCES stores(id),
  status         TEXT NOT NULL DEFAULT 'completed', -- 'active' | 'completed'
  check_in_time  TEXT,
  check_in_lat   REAL,
  check_in_lng   REAL,
  check_in_acc   REAL,
  check_out_time TEXT,
  check_out_lat  REAL,
  check_out_lng  REAL,
  check_out_acc  REAL,
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_user  ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_store ON visits(store_id);
CREATE INDEX IF NOT EXISTS idx_visits_time  ON visits(check_in_time);

CREATE TABLE IF NOT EXISTS photos (
  id            TEXT PRIMARY KEY,
  visit_id      TEXT REFERENCES visits(id) ON DELETE CASCADE,
  store_id      TEXT REFERENCES stores(id),
  user_id       TEXT REFERENCES users(id),
  kind          TEXT NOT NULL DEFAULT 'before',  -- 'before' | 'after' | 'library'
  file_path     TEXT NOT NULL,                   -- relative to uploads/
  original_name TEXT,
  mime          TEXT,
  size          INTEGER,
  exif_date     TEXT,
  caption       TEXT,
  taken_at      TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_visit ON photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_photos_store ON photos(store_id);
CREATE INDEX IF NOT EXISTS idx_photos_time  ON photos(created_at);

CREATE TABLE IF NOT EXISTS tasks (
  id       TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  done     INTEGER NOT NULL DEFAULT 0,
  sort     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_visit ON tasks(visit_id);

CREATE TABLE IF NOT EXISTS orders (
  id       TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  product  TEXT NOT NULL,
  qty      REAL NOT NULL DEFAULT 0,
  unit     TEXT NOT NULL DEFAULT 'tk',
  price    REAL NOT NULL DEFAULT 0,
  notes    TEXT,
  sort     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_visit ON orders(visit_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id       TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  product  TEXT NOT NULL,
  qty      REAL NOT NULL DEFAULT 0,
  unit     TEXT NOT NULL DEFAULT 'tk',
  status   TEXT NOT NULL DEFAULT 'delivered',  -- delivered | partial | rejected
  notes    TEXT,
  sort     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_deliveries_visit ON deliveries(visit_id);
`);

/** Seed an admin account and the default Estonian store list on first boot. */
export function bootstrap() {
  const now = new Date().toISOString();
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

  if (userCount === 0) {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASS || 'admin123';
    db.prepare(
      `INSERT INTO users (id, username, password_hash, name, role, active, created_at)
       VALUES (?, ?, ?, ?, 'admin', 1, ?)`
    ).run(crypto.randomUUID(), username, bcrypt.hashSync(password, 10), 'Administraator', now);
    console.log(`[kylastusgraafik] created admin account "${username}" (password: "${password}")`);
  }

  const storeCount = db.prepare('SELECT COUNT(*) AS n FROM stores').get().n;
  if (storeCount === 0) {
    const defaults = [
      'Rimi Ülemiste',
      'Maxima Kristiine',
      'Selver Rocca al Mare',
      'Prisma Ülemiste',
      'Coop Mustamäe',
      'Lidl Ülemiste',
    ];
    const stmt = db.prepare(
      'INSERT INTO stores (id, name, active, created_at) VALUES (?, ?, 1, ?)'
    );
    for (const name of defaults) stmt.run(crypto.randomUUID(), name, now);
    console.log(`[kylastusgraafik] seeded ${defaults.length} stores`);
  }
}
