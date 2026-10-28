import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/app-error.js';
const audience = 'edupalgh-personal-teacher';
export function createTeacherSessions(secret, expiresIn) {
  const key = createHmac('sha256', secret).update('independent-teacher-session-v1').digest('hex');
  return {
    sign: account => jwt.sign({ accountType: 'teacher' }, key, { subject: account.id, audience, issuer: 'edupalgh', expiresIn }),
    verify(token) {
      try {
        const payload = jwt.verify(token, key, { audience, issuer: 'edupalgh', algorithms: ['HS256'] });
        if (payload.accountType !== 'teacher' || typeof payload.sub !== 'string' || !payload.sub) throw new Error('invalid subject');
        return payload.sub;
      } catch { throw new AppError('Invalid or expired teacher session.', 401, 'INVALID_TEACHER_SESSION'); }
    },
  };
}
export function createTeacherAuthenticate(db, sessions) {
  return async (req, _res, next) => {
    try {
      const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
      if (!token) throw new AppError('Teacher sign-in is required.', 401, 'TEACHER_AUTH_REQUIRED');
      const id = sessions.verify(token);
      const account = await db.teacherAccount.findUnique({ where: { id } });
      if (!account?.isActive) throw new AppError('Teacher session is no longer active.', 401, 'INVALID_TEACHER_SESSION');
      req.teacher = account; next();
    } catch (error) { next(error); }
  };
}
