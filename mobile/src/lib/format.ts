export function ft(d?: string | null) {
  if (!d) return '--:--';
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}

export function fd(d?: string | null) {
  if (!d) return '—';
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
}

export function fdt(d?: string | null) {
  return d ? `${fd(d)} ${ft(d)}` : '—';
}

export function dur(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const m = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}t ${m % 60}min` : `${m} min`;
}

export function eur(n: number) {
  return `${(Number(n) || 0).toFixed(2)} €`;
}

export function uid() {
  // Not cryptographic — just needs to be unique enough to key a list row.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
