import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../errors/app-error.js';

// Deliberately not an application JWT: auth challenges must never be usable as bearer sessions.
export function createGoogleIdentity({ clientId, secret, verifyIdToken, now = Date.now, fallbackName = 'School Administrator' }) {
  const key = createHmac('sha256', secret).update('google-auth-challenge-v1').digest();
  const sign = (value) => createHmac('sha256', key).update(value).digest('base64url');
  function challenge(intent) {
    if (!clientId) throw new AppError('Google sign-in is not configured.', 503, 'GOOGLE_NOT_CONFIGURED');
    const body = Buffer.from(JSON.stringify({ intent, random: randomBytes(24).toString('base64url'), expires: now() + 300000 })).toString('base64url');
    return `${body}.${sign(body)}`;
  }
  async function verify(credential, token, intent) {
    if (!clientId) throw new AppError('Google sign-in is not configured.', 503, 'GOOGLE_NOT_CONFIGURED');
    try {
      const [body, signature, extra] = token.split('.');
      const expected = Buffer.from(sign(body));
      const supplied = Buffer.from(signature || '');
      if (extra || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error('signature');
      const state = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (state.intent !== intent || state.expires <= now() || state.expires > now() + 300000) throw new Error('challenge');
      const ticket = await verifyIdToken({ idToken: credential, audience: clientId });
      const claims = ticket.getPayload();
      if (!claims || claims.nonce !== token || claims.email_verified !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email || '') || claims.email.length > 191 || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new Error('claims');
      const names = String(claims.name || fallbackName).trim().split(/\s+/);
      return { subject: claims.sub, email: claims.email.toLowerCase(), firstName: String(claims.given_name || names[0]).slice(0, 80), lastName: String(claims.family_name || names.slice(1).join(' ') || 'Administrator').slice(0, 80) };
    } catch {
      throw new AppError('Google sign-in could not be verified. Please try again.', 401, 'INVALID_GOOGLE_IDENTITY');
    }
  }
  return { challenge, verify };
}
