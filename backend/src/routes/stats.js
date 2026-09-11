import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah } from '../util.js';

const r = Router();
r.use(requireAdmin);

r.get(
  '/overview',
  ah((req, res) => {
    const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);

    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM visits)                        AS visits,
           (SELECT COUNT(*) FROM visits WHERE status='active')  AS active_visits,
           (SELECT COUNT(*) FROM photos)                        AS photos,
           (SELECT IFNULL(SUM(size),0) FROM photos)             AS photo_bytes,
           (SELECT COUNT(*) FROM stores WHERE active=1)         AS stores,
           (SELECT COUNT(*) FROM users WHERE active=1)          AS users,
           (SELECT IFNULL(SUM(qty*price),0) FROM orders)        AS order_total,
           (SELECT COUNT(*) FROM orders)                        AS orders`
      )
      .get();

    const perDay = db
      .prepare(
        `SELECT substr(check_in_time,1,10) AS day, COUNT(*) AS n
           FROM visits WHERE check_in_time >= ?
          GROUP BY day ORDER BY day`
      )
      .all(since);

    const topStores = db
      .prepare(
        `SELECT s.name, COUNT(v.id) AS visits,
                (SELECT COUNT(*) FROM photos p WHERE p.visit_id IN
                   (SELECT id FROM visits WHERE store_id = s.id)) AS photos
           FROM stores s LEFT JOIN visits v ON v.store_id = s.id
          GROUP BY s.id ORDER BY visits DESC, s.name LIMIT 8`
      )
      .all();

    const byUser = db
      .prepare(
        `SELECT u.name, COUNT(v.id) AS visits
           FROM users u LEFT JOIN visits v ON v.user_id = u.id
          WHERE u.active = 1
          GROUP BY u.id ORDER BY visits DESC LIMIT 8`
      )
      .all();

    const deliveries = db
      .prepare('SELECT status, COUNT(*) AS n FROM deliveries GROUP BY status')
      .all();

    res.json({ totals, perDay, topStores, byUser, deliveries });
  })
);

export default r;
