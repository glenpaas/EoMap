import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah, id, nowIso, toBool } from '../util.js';

const r = Router();
r.use(requireAdmin);

const PUBLIC_COLS = `id, username, name, role, active, created_at`;

r.get(
  '/',
  ah((req, res) => {
    const users = db
      .prepare(
        `SELECT ${PUBLIC_COLS},
                (SELECT COUNT(*) FROM visits v WHERE v.user_id = users.id) AS visit_count,
                (SELECT MAX(v.check_in_time) FROM visits v WHERE v.user_id = users.id) AS last_visit
           FROM users ORDER BY active DESC, name COLLATE NOCASE`
      )
      .all();
    res.json({ users });
  })
);

r.post(
  '/',
  ah((req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim() || username;
    const role = req.body?.role === 'admin' ? 'admin' : 'field';

    if (!username) return res.status(400).json({ error: 'Kasutajanimi on kohustuslik' });
    if (password.length < 6) return res.status(400).json({ error: 'Parool peab olema vähemalt 6 märki' });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      return res.status(409).json({ error: 'See kasutajanimi on juba võetud' });
    }

    const uid = id();
    db.prepare(
      `INSERT INTO users (id, username, password_hash, name, role, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(uid, username, bcrypt.hashSync(password, 10), name, role, nowIso());
    res.status(201).json({ user: db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`).get(uid) });
  })
);

r.patch(
  '/:id',
  ah((req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Kasutajat ei leitud' });

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : user.name;
    const role = req.body?.role !== undefined ? (req.body.role === 'admin' ? 'admin' : 'field') : user.role;
    const active = req.body?.active !== undefined ? toBool(req.body.active) : user.active;

    // Never let the last working admin lock everyone out of the panel.
    if (user.role === 'admin' && (role !== 'admin' || !active)) {
      const others = db
        .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?")
        .get(user.id).n;
      if (others === 0) return res.status(400).json({ error: 'Viimast administraatorit ei saa eemaldada' });
    }

    db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?')
      .run(name, role, active, user.id);

    if (req.body?.password) {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({ error: 'Parool peab olema vähemalt 6 märki' });
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(bcrypt.hashSync(String(req.body.password), 10), user.id);
    }
    res.json({ user: db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`).get(user.id) });
  })
);

r.delete(
  '/:id',
  ah((req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Iseennast ei saa kustutada' });
    }
    const visits = db.prepare('SELECT COUNT(*) AS n FROM visits WHERE user_id = ?').get(req.params.id).n;
    if (visits > 0) {
      db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ ok: true, deactivated: true, visits });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true, deactivated: false });
  })
);

export default r;
