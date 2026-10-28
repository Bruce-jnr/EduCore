import { AppError } from '../../errors/app-error.js';
export const teacherProfile = account => ({ id: account.id, firstName: account.firstName, lastName: account.lastName, email: account.email, accountType: 'teacher', roles: ['Independent Teacher'], permissions: ['lesson-plans.view','lesson-plans.manage'] });
export function createTeacherAuthService({ db, hash, compare, signSession, identity, now = () => new Date() }) {
  const session = account => ({ token: signSession(account), user: teacherProfile(account) });
  async function record(tx, account, action) {
    await tx.teacherAccount.update({ where: { id: account.id }, data: { lastLoginAt: now() } });
    await tx.teacherActivity.create({ data: { teacherId: account.id, action } });
  }
  return {
    async register(input) {
      const passwordHash = await hash(input.password, 12);
      try {
        const account = await db.$transaction(async tx => {
          const created = await tx.teacherAccount.create({ data: { firstName: input.firstName, lastName: input.lastName, email: input.email, passwordHash } });
          await record(tx, created, 'SIGNUP'); return created;
        });
        return session(account);
      } catch (error) { if (error.code === 'P2002') throw new AppError('An account already uses this email or Google identity. Sign in using your original method.', 409, 'TEACHER_ACCOUNT_EXISTS'); throw error; }
    },
    async login(input) {
      const account = await db.teacherAccount.findUnique({ where: { email: input.email } });
      // A fixed valid bcrypt hash ensures absent/Google-only accounts still perform a comparison.
      const matched = await compare(input.password, account?.passwordHash || '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
      if (!account?.isActive || !account.passwordHash || !matched) throw new AppError('Invalid teacher email or password.', 401, 'INVALID_TEACHER_CREDENTIALS');
      await db.$transaction(async tx => { await record(tx, account, 'LOGIN'); });
      return session(account);
    },
    async google(intent, input) {
      const profile = await identity.verify(input.credential, input.challenge, `teacher-${intent}`);
      try {
        const account = await db.$transaction(async tx => {
          let current = await tx.teacherAccount.findUnique({ where: { googleSubject: profile.subject } });
          if (intent === 'signup') {
            if (current) throw new AppError('This Google teacher account already exists. Sign in instead.', 409, 'TEACHER_ACCOUNT_EXISTS');
            current = await tx.teacherAccount.create({ data: { firstName: profile.firstName, lastName: profile.lastName, email: profile.email, googleSubject: profile.subject, emailVerifiedAt: now() } });
          }
          if (!current?.isActive) throw new AppError('No active teacher account is linked to this Google identity. Create a teacher account or use your original sign-in method.', 403, 'TEACHER_ACCOUNT_UNAVAILABLE');
          await record(tx, current, intent === 'signup' ? 'GOOGLE_SIGNUP' : 'LOGIN'); return current;
        });
        return session(account);
      } catch (error) { if (error.code === 'P2002') throw new AppError('An account already uses this email or Google identity. Sign in using your original method.', 409, 'TEACHER_ACCOUNT_EXISTS'); throw error; }
    },
  };
}
