import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';
import { UPLOADS } from '../paths.js';
import { ah, id, nowIso, pageParams } from '../util.js';

const r = Router();

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const d = new Date();
    const dir = path.join(UPLOADS, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    const base = crypto.randomUUID();
    const suffix = file.fieldname === 'thumb' ? '.thumb' : '';
    cb(null, base + suffix + (EXT[file.mimetype] || '.jpg'));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 2 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error('Toetamata failitüüp: ' + file.mimetype));
    cb(null, true);
  },
});

const rel = (abs) => path.relative(UPLOADS, abs).split(path.sep).join('/');

function shape(p) {
  return {
    id: p.id,
    visitId: p.visit_id,
    storeId: p.store_id,
    storeName: p.store_name,
    userId: p.user_id,
    userName: p.user_name,
    kind: p.kind,
    url: `/api/photos/${p.id}/file`,
    thumbUrl: `/api/photos/${p.id}/file?size=thumb`,
    originalName: p.original_name,
    mime: p.mime,
    size: p.size,
    exifDate: p.exif_date,
    takenAt: p.taken_at,
    caption: p.caption,
    createdAt: p.created_at,
    visitDate: p.check_in_time,
  };
}

// ── upload ──────────────────────────────────────────────────────────────────
// Accepts `photo` (required) and an optional pre-scaled `thumb` the app generates,
// which keeps the gallery fast without a native image library on the server.
r.post(
  '/',
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]),
  ah((req, res) => {
    const file = req.files?.photo?.[0];
    if (!file) return res.status(400).json({ error: 'Fail puudub' });

    const kind = ['before', 'after', 'library'].includes(req.body.kind) ? req.body.kind : 'before';
    const visitId = req.body.visitId || null;

    if (visitId) {
      const visit = db.prepare('SELECT user_id FROM visits WHERE id = ?').get(visitId);
      if (visit && req.user.role !== 'admin' && visit.user_id !== req.user.id) {
        fs.rm(file.path, { force: true }, () => {});
        return res.status(403).json({ error: 'Puuduvad õigused' });
      }
    } else if (kind !== 'library') {
      return res.status(400).json({ error: 'visitId on kohustuslik' });
    }

    const thumb = req.files?.thumb?.[0];
    if (thumb) {
      // Park the thumb beside the original under the canonical "<file>.thumb.<ext>" name.
      const target = file.path.replace(/(\.[^.]+)$/, '.thumb$1');
      try {
        fs.renameSync(thumb.path, target);
      } catch {
        fs.rm(thumb.path, { force: true }, () => {});
      }
    }

    const photoId = id();
    db.prepare(
      `INSERT INTO photos (id, visit_id, store_id, user_id, kind, file_path, original_name,
                           mime, size, exif_date, caption, taken_at, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      photoId,
      visitId,
      req.body.storeId || null,
      req.user.id,
      kind,
      rel(file.path),
      file.originalname || null,
      file.mimetype,
      file.size,
      req.body.exifDate || null,
      req.body.caption || null,
      req.body.takenAt || null,
      nowIso()
    );

    res.status(201).json({ photo: shape(db.prepare('SELECT * FROM photos WHERE id = ?').get(photoId)) });
  })
);

// ── gallery listing ─────────────────────────────────────────────────────────
r.get(
  '/',
  ah((req, res) => {
    const { limit, page, offset } = pageParams(req.query, 60);
    const where = [];
    const args = [];

    if (req.user.role !== 'admin') {
      where.push('p.user_id = ?');
      args.push(req.user.id);
    } else if (req.query.userId) {
      where.push('p.user_id = ?');
      args.push(req.query.userId);
    }
    if (req.query.storeId) {
      where.push('(p.store_id = ? OR v.store_id = ?)');
      args.push(req.query.storeId, req.query.storeId);
    }
    if (req.query.kind) {
      where.push('p.kind = ?');
      args.push(req.query.kind);
    }
    if (req.query.visitId) {
      where.push('p.visit_id = ?');
      args.push(req.query.visitId);
    }
    if (req.query.from) {
      where.push('p.created_at >= ?');
      args.push(String(req.query.from));
    }
    if (req.query.to) {
      where.push('p.created_at <= ?');
      args.push(String(req.query.to) + 'T23:59:59.999Z');
    }
    if (req.query.q) {
      where.push('(p.original_name LIKE ? OR p.caption LIKE ? OR s.name LIKE ?)');
      const like = `%${req.query.q}%`;
      args.push(like, like, like);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const base = `FROM photos p
                  LEFT JOIN visits v ON v.id = p.visit_id
                  LEFT JOIN stores s ON s.id = COALESCE(p.store_id, v.store_id)
                  LEFT JOIN users  u ON u.id = p.user_id
                  ${clause}`;

    const agg = db.prepare(`SELECT COUNT(*) AS n, IFNULL(SUM(p.size), 0) AS bytes ${base}`).get(...args);
    const rows = db
      .prepare(
        `SELECT p.*, s.name AS store_name, u.name AS user_name, v.check_in_time
         ${base}
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset);

    res.json({
      photos: rows.map(shape),
      total: agg.n,
      totalBytes: agg.bytes,
      page,
      limit,
      pages: Math.ceil(agg.n / limit) || 1,
    });
  })
);

// ── serve the file ──────────────────────────────────────────────────────────
r.get(
  '/:id/file',
  ah((req, res) => {
    const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pilti ei leitud' });
    if (req.user.role !== 'admin' && p.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Puuduvad õigused' });
    }

    let abs = path.join(UPLOADS, p.file_path);
    if (req.query.size === 'thumb') {
      const t = abs.replace(/(\.[^.]+)$/, '.thumb$1');
      if (fs.existsSync(t)) abs = t; // otherwise fall back to the original
    }
    if (!fs.existsSync(abs)) return res.status(410).json({ error: 'Fail on kettalt kadunud' });

    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    if (req.query.download === '1') {
      return res.download(abs, p.original_name || path.basename(abs));
    }
    res.sendFile(abs);
  })
);

// ── edit caption ────────────────────────────────────────────────────────────
r.patch(
  '/:id',
  ah((req, res) => {
    const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pilti ei leitud' });
    if (req.user.role !== 'admin' && p.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Puuduvad õigused' });
    }
    db.prepare('UPDATE photos SET caption = ?, kind = ? WHERE id = ?').run(
      req.body?.caption !== undefined ? String(req.body.caption) : p.caption,
      ['before', 'after', 'library'].includes(req.body?.kind) ? req.body.kind : p.kind,
      p.id
    );
    res.json({ photo: shape(db.prepare('SELECT * FROM photos WHERE id = ?').get(p.id)) });
  })
);

// ── delete (one or many) ────────────────────────────────────────────────────
/** Remove a photo's original and its thumb sibling from disk. */
export function removePhotoFiles(filePath) {
  const abs = path.join(UPLOADS, filePath);
  fs.rm(abs, { force: true }, () => {});
  fs.rm(abs.replace(/(\.[^.]+)$/, '.thumb$1'), { force: true }, () => {});
}

function removePhoto(photo) {
  removePhotoFiles(photo.file_path);
  db.prepare('DELETE FROM photos WHERE id = ?').run(photo.id);
}

r.delete(
  '/:id',
  ah((req, res) => {
    const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pilti ei leitud' });
    if (req.user.role !== 'admin' && p.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Puuduvad õigused' });
    }
    removePhoto(p);
    res.json({ ok: true });
  })
);

r.post(
  '/bulk-delete',
  requireAdmin,
  ah((req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'Ühtegi pilti pole valitud' });

    let removed = 0;
    for (const pid of ids) {
      const p = db.prepare('SELECT * FROM photos WHERE id = ?').get(String(pid));
      if (p) {
        removePhoto(p);
        removed++;
      }
    }
    res.json({ ok: true, removed });
  })
);

export default r;
