import crypto from 'crypto';

/**
 * Простые подписанные токены сессии: userId + срок годности + HMAC-подпись.
 * Без сторонних зависимостей (jsonwebtoken и т.п.) — сути ради это не нужно,
 * это ровно то же самое, но без лишнего пакета.
 *
 * SESSION_SECRET обязательно задать в проде через переменную окружения —
 * дефолт ниже подходит только для локальной разработки.
 */

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me-in-prod';

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn(
    '[session] ВНИМАНИЕ: SESSION_SECRET не задан в проде — используется небезопасный дефолт. ' +
    'Задай SESSION_SECRET в переменных окружения.'
  );
}

export function issueToken(userId: number, ttlSeconds = 30 * 24 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [userIdStr, expStr, sig] = parts;
    const payload = `${userIdStr}.${expStr}`;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    const validSig =
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    if (!validSig) return null;
    if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
    return Number(userIdStr);
  } catch {
    return null;
  }
}
