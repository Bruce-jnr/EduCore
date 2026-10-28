import { AppError } from '../../errors/app-error.js';
export function googleRequestOrigin(clientUrl) {
  const origin = new URL(clientUrl).origin;
  return (req, _res, next) => {
    if (req.get('origin') !== origin || !req.is('application/json')) return next(new AppError('Google authentication requires a JSON request from the application.', 403, 'INVALID_AUTH_ORIGIN'));
    next();
  };
}
// Per-process protection; deployments with several API instances also need an edge/shared limiter.
export function createGoogleRateLimit({ now = Date.now, limit = 30, windowMs = 600000 } = {}) {
  const requests = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, bucket] of requests) if (bucket.until <= time) requests.delete(key);
    const key = req.ip || 'unknown';
    if (!requests.has(key) && requests.size >= 5000) return next(new AppError('Authentication is busy. Try again shortly.', 429, 'AUTH_RATE_LIMITED'));
    const bucket = requests.get(key) || { count: 0, until: time + windowMs };
    requests.set(key, bucket);
    if (++bucket.count > limit) {
      res.set('Retry-After', String(Math.ceil((bucket.until - time) / 1000)));
      return next(new AppError('Too many Google authentication attempts. Try again later.', 429, 'AUTH_RATE_LIMITED'));
    }
    next();
  };
}
