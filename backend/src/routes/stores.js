import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah, id, nowIso, toBool, toNullNum } from '../util.js';

const r = Router();

r.get(
  '/',
  ah((req, res) => {
    const includeInactive = req.query.all === '1' && req.user.role === 'admin';
    const rows = db
      .prepare(
        `SELECT s.*,
                (SELECT COUNT(*) FROM visits v WHERE v.store_id = s.id) AS visit_count,
                (SELECT MAX(v.check_in_time) FROM visits v WHERE v.store_id = s.id) AS last_visit
           FROM stores s
          ${includeInactive ? '' : 'WHERE s.active = 1'}
          ORDER BY s.name COLLATE NOCASE`
      )
      .all();
    res.json({ stores: rows });
  })
);

r.post(
  '/',
  requireAdmin,
  ah((req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Poe nimi on kohustuslik' });

    const store = {
      id: id(),
      name,
      address: String(req.body?.address || '').trim() || null,
      lat: toNullNum(req.body?.lat),
      lng: toNullNum(req.body?.lng),
      created_at: nowIso(),
    };
    db.prepare(
      `INSERT INTO stores (id, name, address, lat, lng, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(store.id, store.name, store.address, store.lat, store.lng, store.created_at);
    res.status(201).json({ store: db.prepare('SELECT * FROM stores WHERE id = ?').get(store.id) });
  })
);

r.patch(
  '/:id',
  requireAdmin,
  ah((req, res) => {
    const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Poodi ei leitud' });

    const next = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : existing.name,
      address: req.body?.address !== undefined ? String(req.body.address).trim() || null : existing.address,
      lat: req.body?.lat !== undefined ? toNullNum(req.body.lat) : existing.lat,
      lng: req.body?.lng !== undefined ? toNullNum(req.body.lng) : existing.lng,
      active: req.body?.active !== undefined ? toBool(req.body.active) : existing.active,
    };
    if (!next.name) return res.status(400).json({ error: 'Poe nimi on kohustuslik' });

    db.prepare('UPDATE stores SET name = ?, address = ?, lat = ?, lng = ?, active = ? WHERE id = ?')
      .run(next.name, next.address, next.lat, next.lng, next.active, req.params.id);
    res.json({ store: db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id) });
  })
);

// Stores with visit history are deactivated rather than deleted, so old reports keep their name.
r.delete(
  '/:id',
  requireAdmin,
  ah((req, res) => {
    const used = db.prepare('SELECT COUNT(*) AS n FROM visits WHERE store_id = ?').get(req.params.id).n;
    if (used > 0) {
      db.prepare('UPDATE stores SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ ok: true, deactivated: true, visits: used });
    }
    db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
    res.json({ ok: true, deactivated: false });
  })
);

export default r;
