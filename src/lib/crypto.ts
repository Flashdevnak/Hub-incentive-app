import crypto from 'crypto';

const ITERATIONS = 120000;
const KEYLEN = 32;
const DIGEST = 'sha256';

export function normalizeCode(code: string) {
  return String(code || '').trim().toUpperCase();
}

export function normalizeDate(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  // Supports yyyy-mm-dd, dd/mm/yyyy, dd/mm/yy, Excel serial date already converted by xlsx.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += y > 50 ? 1900 : 2000;
    // Thai Buddhist year support
    if (y > 2400) y -= 543;
    const mm = String(Number(m[2])).padStart(2, '0');
    const dd = String(Number(m[1])).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

export function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPin(pin: string, encoded?: string) {
  if (!encoded) return false;
  const [scheme, iterRaw, salt, expected] = encoded.split('$');
  if (scheme !== 'pbkdf2' || !iterRaw || !salt || !expected) return false;
  const hash = crypto.pbkdf2Sync(pin, salt, Number(iterRaw), KEYLEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
}

export function sign(payload: object, maxAgeSeconds: number) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Missing SESSION_SECRET');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifySigned<T = any>(token?: string): T | null {
  try {
    if (!token) return null;
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch { return null; }
}

export function randomId(prefix = '') {
  return prefix + crypto.randomBytes(10).toString('hex');
}
