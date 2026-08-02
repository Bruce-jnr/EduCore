import { authService } from './auth.service.js';

export async function login(req, res) {
  const data = await authService.login(req.validated.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.json({ success: true, data, message: 'Signed in successfully' });
}

export function currentUser(req, res) {
  res.json({ success: true, data: { auth: req.auth, tenant: req.tenant }, message: null });
}
