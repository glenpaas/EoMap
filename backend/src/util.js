/** Wrap an async route handler so rejections reach the error middleware. */
export function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function nowIso() {
  return new Date().toISOString();
}

export function toNum(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function toNullNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** SQLite has no boolean type — store 0/1. */
export function toBool(v) {
  return v ? 1 : 0;
}

export function id() {
  return crypto.randomUUID();
}

/** Clamp a page-size parameter to something a browser can actually render. */
export function pageParams(query, defaultLimit = 50, maxLimit = 500) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}
