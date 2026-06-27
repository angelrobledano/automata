import { connection } from '../queue';

export async function isRateLimited(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `rate_limit:${identifier}`;
  const current = await connection.incr(key);
  if (current === 1) {
    await connection.expire(key, windowSeconds);
  }
  return current > limit;
}
