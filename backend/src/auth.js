import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const SECRET = process.env.JWT_SECRET || 'kylastusgraafik-dev-secret-change-me';
const TTL = '30d'; // field staff should not be logged out mid-route

export function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, SECRET, {
    expiresIn: TTL,
  });
}

function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  // <img src> and download links cannot set headers, so allow a query token too.
  if (typeof req.query.token === 'string' && req.query.token) return req.query.token;
  return null;
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Autentimine puudub' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db
      .prepare('SELECT id, username, name, role, active FROM users WHERE id = ?')
      .get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: 'Konto pole aktiivne' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessioon on aegunud' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Puuduvad õigused' });
  next();
}
