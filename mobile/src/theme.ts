/** Shared design tokens — mirrors the web app's palette so both feel like one product. */
export const C = {
  bg: '#0B0D13',
  s1: '#141720',
  s2: '#1C1F2E',
  s3: '#252A3D',
  br: 'rgba(255,255,255,0.07)',
  br2: 'rgba(255,255,255,0.14)',

  a: '#F59E0B',
  ad: 'rgba(245,158,11,0.13)',
  ok: '#10B981',
  okd: 'rgba(16,185,129,0.13)',
  err: '#EF4444',
  errd: 'rgba(239,68,68,0.13)',
  inf: '#3B82F6',
  infd: 'rgba(59,130,246,0.13)',
  pur: '#A78BFA',
  purd: 'rgba(167,139,250,0.13)',

  t1: '#F0F4F8',
  t2: '#8896A5',
  t3: '#4A5768',

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const R = { sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const F = {
  mono: 'Menlo',
} as const;
