import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { sign, requireAuth } from '../auth.js';
import { ah } from '../util.js';

const r = Router();

r.post(
  '/login',
  ah((req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Kasutajanimi ja parool on kohustuslikud' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Vale kasutajanimi või parool' });
    }
    if (!user.active) return res.status(403).json({ error: 'Konto on deaktiveeritud' });

    res.json({
      token: sign(user),
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  })
);

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.post(
  '/password',
  requireAuth,
  ah((req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Uus parool peab olema vähemalt 6 märki' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(String(currentPassword || ''), user.password_hash)) {
      return res.status(401).json({ error: 'Praegune parool on vale' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(String(newPassword), 10),
      user.id
    );
    res.json({ ok: true });
  })
);

export default r;
