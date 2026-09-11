import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';
import { removePhotoFiles } from './photos.js';
import { ah, id, nowIso, pageParams, toBool, toNullNum, toNum } from '../util.js';

const r = Router();

const DELIVERY_STATUSES = new Set(['delivered', 'partial', 'rejected']);

function photoRows(visitId) {
  return db
    .prepare('SELECT * FROM photos WHERE visit_id = ? ORDER BY kind DESC, created_at')
    .all(visitId)
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      url: `/api/photos/${p.id}/file`,
      thumbUrl: `/api/photos/${p.id}/file?size=thumb`,
      originalName: p.original_name,
      size: p.size,
      mime: p.mime,
      exifDate: p.exif_date,
      takenAt: p.taken_at,
      caption: p.caption,
      createdAt: p.created_at,
    }));
}

/** Assemble a visit plus every child collection — the shape both the app and panel render. */
export function fullVisit(visitId) {
  const v = db
    .prepare(
      `SELECT v.*, s.name AS store_name, s.address AS store_address, u.name AS user_name, u.username
         FROM visits v
         JOIN stores s ON s.id = v.store_id
         JOIN users  u ON u.id = v.user_id
        WHERE v.id = ?`
    )
    .get(visitId);
  if (!v) return null;

  return {
    id: v.id,
    status: v.status,
    storeId: v.store_id,
    storeName: v.store_name,
    storeAddress: v.store_address,
    userId: v.user_id,
    userName: v.user_name,
    username: v.username,
    notes: v.notes,
    checkIn: v.check_in_time
      ? {
          time: v.check_in_time,
          gps: v.check_in_lat !== null
            ? { lat: v.check_in_lat, lng: v.check_in_lng, accuracy: v.check_in_acc }
            : null,
        }
      : null,
    checkOut: v.check_out_time
      ? {
          time: v.check_out_time,
          gps: v.check_out_lat !== null
            ? { lat: v.check_out_lat, lng: v.check_out_lng, accuracy: v.check_out_acc }
            : null,
        }
      : null,
    photos: photoRows(v.id),
    tasks: db.prepare('SELECT id, text, done, sort FROM tasks WHERE visit_id = ? ORDER BY sort').all(v.id)
      .map((t) => ({ ...t, done: !!t.done })),
    orders: db.prepare('SELECT * FROM orders WHERE visit_id = ? ORDER BY sort').all(v.id),
    deliveries: db.prepare('SELECT * FROM deliveries WHERE visit_id = ? ORDER BY sort').all(v.id),
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

function canSee(req, visitUserId) {
  return req.user.role === 'admin' || req.user.id === visitUserId;
}

// ── list ────────────────────────────────────────────────────────────────────
r.get(
  '/',
  ah((req, res) => {
    const { limit, page, offset } = pageParams(req.query, 50);
    const where = [];
    const args = [];

    // Field staff only ever see their own visits, whatever they ask for.
    if (req.user.role !== 'admin') {
      where.push('v.user_id = ?');
      args.push(req.user.id);
    } else if (req.query.userId) {
      where.push('v.user_id = ?');
      args.push(req.query.userId);
    }
    if (req.query.storeId) {
      where.push('v.store_id = ?');
      args.push(req.query.storeId);
    }
    if (req.query.status) {
      where.push('v.status = ?');
      args.push(req.query.status);
    }
    if (req.query.from) {
      where.push('v.check_in_time >= ?');
      args.push(String(req.query.from));
    }
    if (req.query.to) {
      where.push('v.check_in_time <= ?');
      args.push(String(req.query.to) + 'T23:59:59.999Z');
    }
    if (req.query.q) {
      where.push('(s.name LIKE ? OR v.notes LIKE ? OR u.name LIKE ?)');
      const like = `%${req.query.q}%`;
      args.push(like, like, like);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS n FROM visits v JOIN stores s ON s.id = v.store_id JOIN users u ON u.id = v.user_id ${clause}`)
      .get(...args).n;

    const rows = db
      .prepare(
        `SELECT v.id, v.status, v.check_in_time, v.check_out_time, v.notes,
                v.store_id, s.name AS store_name,
                v.user_id, u.name AS user_name,
                (SELECT COUNT(*) FROM photos p WHERE p.visit_id = v.id) AS photo_count,
                (SELECT COUNT(*) FROM orders o WHERE o.visit_id = v.id) AS order_count,
                (SELECT IFNULL(SUM(o.qty * o.price), 0) FROM orders o WHERE o.visit_id = v.id) AS order_total,
                (SELECT COUNT(*) FROM deliveries d WHERE d.visit_id = v.id) AS delivery_count,
                (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id) AS task_count,
                (SELECT COUNT(*) FROM tasks t WHERE t.visit_id = v.id AND t.done = 1) AS task_done
           FROM visits v
           JOIN stores s ON s.id = v.store_id
           JOIN users  u ON u.id = v.user_id
           ${clause}
          ORDER BY v.check_in_time DESC
          LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset);

    res.json({ visits: rows, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  })
);

// ── detail ──────────────────────────────────────────────────────────────────
r.get(
  '/:id',
  ah((req, res) => {
    const visit = fullVisit(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Külastust ei leitud' });
    if (!canSee(req, visit.userId)) return res.status(403).json({ error: 'Puuduvad õigused' });
    res.json({ visit });
  })
);

// ── create / sync ───────────────────────────────────────────────────────────
// The mobile app owns a visit while it is in progress and pushes the whole thing
// on check-out. Re-sending the same id replaces the children, so a retry after a
// failed upload cannot duplicate rows.
r.put(
  '/:id',
  ah((req, res) => {
    const visitId = String(req.params.id);
    const body = req.body || {};
    const now = nowIso();

    const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(String(body.storeId || ''));
    if (!store) return res.status(400).json({ error: 'Tundmatu pood' });

    const existing = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
    if (existing && !canSee(req, existing.user_id)) {
      return res.status(403).json({ error: 'Puuduvad õigused' });
    }

    const ci = body.checkIn || {};
    const co = body.checkOut || null;
    const status = body.status === 'active' ? 'active' : 'completed';

    db.exec('BEGIN');
    try {
      if (existing) {
        db.prepare(
          `UPDATE visits SET store_id = ?, status = ?, check_in_time = ?, check_in_lat = ?,
                  check_in_lng = ?, check_in_acc = ?, check_out_time = ?, check_out_lat = ?,
                  check_out_lng = ?, check_out_acc = ?, notes = ?, updated_at = ?
             WHERE id = ?`
        ).run(
          store.id, status,
          ci.time || existing.check_in_time, toNullNum(ci.gps?.lat), toNullNum(ci.gps?.lng), toNullNum(ci.gps?.accuracy),
          co?.time || null, toNullNum(co?.gps?.lat), toNullNum(co?.gps?.lng), toNullNum(co?.gps?.accuracy),
          String(body.notes ?? existing.notes), now, visitId
        );
      } else {
        db.prepare(
          `INSERT INTO visits (id, user_id, store_id, status, check_in_time, check_in_lat, check_in_lng,
                               check_in_acc, check_out_time, check_out_lat, check_out_lng, check_out_acc,
                               notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(
          visitId, req.user.id, store.id, status,
          ci.time || now, toNullNum(ci.gps?.lat), toNullNum(ci.gps?.lng), toNullNum(ci.gps?.accuracy),
          co?.time || null, toNullNum(co?.gps?.lat), toNullNum(co?.gps?.lng), toNullNum(co?.gps?.accuracy),
          String(body.notes || ''), now, now
        );
      }

      // Photos live in their own upload endpoint, so only these three are replaced.
      for (const table of ['tasks', 'orders', 'deliveries']) {
        db.prepare(`DELETE FROM ${table} WHERE visit_id = ?`).run(visitId);
      }

      const taskStmt = db.prepare('INSERT INTO tasks (id, visit_id, text, done, sort) VALUES (?,?,?,?,?)');
      (body.tasks || []).forEach((t, i) => {
        if (!t?.text) return;
        taskStmt.run(t.id || id(), visitId, String(t.text), toBool(t.done), i);
      });

      const orderStmt = db.prepare(
        'INSERT INTO orders (id, visit_id, product, qty, unit, price, notes, sort) VALUES (?,?,?,?,?,?,?,?)'
      );
      (body.orders || []).forEach((o, i) => {
        if (!o?.product) return;
        orderStmt.run(o.id || id(), visitId, String(o.product), toNum(o.qty), String(o.unit || 'tk'), toNum(o.price), o.notes ? String(o.notes) : null, i);
      });

      const delStmt = db.prepare(
        'INSERT INTO deliveries (id, visit_id, product, qty, unit, status, notes, sort) VALUES (?,?,?,?,?,?,?,?)'
      );
      (body.deliveries || []).forEach((d, i) => {
        if (!d?.product) return;
        const st = DELIVERY_STATUSES.has(d.status) ? d.status : 'delivered';
        delStmt.run(d.id || id(), visitId, String(d.product), toNum(d.qty), String(d.unit || 'tk'), st, d.notes ? String(d.notes) : null, i);
      });

      // Photos uploaded before the visit row existed are adopted here.
      db.prepare('UPDATE photos SET store_id = ?, user_id = ? WHERE visit_id = ?')
        .run(store.id, existing ? existing.user_id : req.user.id, visitId);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.status(existing ? 200 : 201).json({ visit: fullVisit(visitId) });
  })
);

// ── delete ──────────────────────────────────────────────────────────────────
r.delete(
  '/:id',
  requireAdmin,
  ah((req, res) => {
    const photos = db.prepare('SELECT file_path FROM photos WHERE visit_id = ?').all(req.params.id);
    const result = db.prepare('DELETE FROM visits WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Külastust ei leitud' });

    for (const p of photos) removePhotoFiles(p.file_path);
    res.json({ ok: true, removedPhotos: photos.length });
  })
);

// ── CSV export ──────────────────────────────────────────────────────────────
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

r.get(
  '/:id/export.csv',
  ah((req, res) => {
    const v = fullVisit(req.params.id);
    if (!v) return res.status(404).json({ error: 'Külastust ei leitud' });
    if (!canSee(req, v.userId)) return res.status(403).json({ error: 'Puuduvad õigused' });

    const lines = [
      ['Pood', v.storeName],
      ['Külastaja', v.userName],
      ['Check-in', v.checkIn?.time || ''],
      ['Check-out', v.checkOut?.time || ''],
      ['Märkmed', v.notes],
      [],
      ['TELLIMUSED'],
      ['Toode', 'Kogus', 'Ühik', 'Hind', 'Summa', 'Märkused'],
      ...v.orders.map((o) => [o.product, o.qty, o.unit, o.price, (o.qty * o.price).toFixed(2), o.notes || '']),
      [],
      ['TARNE'],
      ['Toode', 'Kogus', 'Ühik', 'Staatus', 'Märkused'],
      ...v.deliveries.map((d) => [d.product, d.qty, d.unit, d.status, d.notes || '']),
      [],
      ['ÜLESANDED'],
      ['Ülesanne', 'Tehtud'],
      ...v.tasks.map((t) => [t.text, t.done ? 'jah' : 'ei']),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kylastus-${v.id.slice(0, 8)}.csv"`);
    res.send('﻿' + lines.map((row) => row.map(csvCell).join(';')).join('\n'));
  })
);

export default r;
