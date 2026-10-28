import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleIdentity } from '../server/modules/auth/google-identity.js';
import { createGoogleService } from '../server/modules/auth/google.service.js';
import { createGoogleRateLimit, googleRequestOrigin } from '../server/modules/auth/google-security.js';

function verifier(overrides = {}) {
  let token;
  let time = 100000;
  let claims = { sub: 'google-123', email: 'ADMIN@example.com', email_verified: true, given_name: 'Jane', family_name: 'Doe' };
  const identity = createGoogleIdentity({ clientId: 'client-id', secret: 'test-secret-at-least-32-characters', now: () => time, verifyIdToken: async (options) => {
    assert.equal(options.audience, 'client-id');
    assert.equal(options.idToken, 'credential');
    return { getPayload: () => ({ nonce: token, ...claims }) };
  }, ...overrides });
  token = identity.challenge('signup');
  return { identity, get token() { return token; }, setClaims(value) { claims = { ...claims, ...value }; }, expire() { time += 300001; } };
}
test('verified Google identity uses subject and normalized email', async () => {
  const v = verifier();
  assert.deepEqual(await v.identity.verify('credential', v.token, 'signup'), { subject: 'google-123', email: 'admin@example.com', firstName: 'Jane', lastName: 'Doe' });
  assert.notEqual(v.token.split('.').length, 3, 'challenge must not be an application JWT');
});
for (const [name, change] of [
  ['expired challenge', (v) => v.expire()],
  ['wrong nonce', (v) => v.setClaims({ nonce: 'attacker' })],
  ['unverified email', (v) => v.setClaims({ email_verified: false })],
  ['missing subject', (v) => v.setClaims({ sub: '' })],
]) test(`rejects ${name}`, async () => {
  const v = verifier(); change(v);
  await assert.rejects(v.identity.verify('credential', v.token, 'signup'), { code: 'INVALID_GOOGLE_IDENTITY' });
});
test('rejects challenge tampering and wrong intent before provider verification', async () => {
  const v = verifier();
  await assert.rejects(v.identity.verify('credential', v.token + 'x', 'signup'), { statusCode: 401 });
  await assert.rejects(v.identity.verify('credential', v.token, 'signin'), { statusCode: 401 });
});
test('unconfigured client fails closed', () => {
  assert.throws(() => verifier({ clientId: '' }), { code: 'GOOGLE_NOT_CONFIGURED' });
});

function fixture({ existing = false, registration = true, auditError = false, uniqueError = false, expired = false, platform = false, inactive = false } = {}) {
  const calls = [];
  const settings = { registrationEnabled: registration, maintenanceMode: false, defaultTrialDays: 14, defaultCountry: 'Ghana', defaultCurrency: 'GHS', defaultTimezone: 'Africa/Accra' };
  const tenant = { id: 'school1', name: 'Test school', slug: 'test-school', isActive: !inactive, subscriptionPlan: 'PROFESSIONAL', subscriptionEndsAt: new Date('2099-01-01T00:00:00Z'), subscriptionStatus: expired ? 'EXPIRED' : 'TRIAL' };
  const account = { id: 'user1', tenantId: tenant.id, tenant, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', status: 'ACTIVE', isPlatformUser: platform, userRoles: [{ role: { name: 'School Administrator', permissions: [{ permission: { key: 'dashboard.view' } }] } }] };
  const tx = {
    platformSettings: { findUnique: async () => settings },
    permission: { findMany: async (args) => { assert.equal(args.where.key.not.startsWith, 'platform.'); return [{ id: 'p1', key: 'dashboard.view' }]; } },
    tenant: { create: async ({ data }) => { calls.push(['tenant', data]); Object.assign(tenant, { subscriptionEndsAt: null }, data); return tenant; } },
    role: { create: async ({ data }) => { calls.push(['role', data]); return { id: 'role1' }; } },
    user: {
      findUnique: async ({ where }) => { assert.deepEqual(where, { googleSubject: 'google1' }); return existing ? account : null; },
      create: async ({ data }) => { calls.push(['user', data]); if (uniqueError) throw Object.assign(new Error('unique'), { code: 'P2002' }); return account; },
      update: async ({ data }) => { calls.push(['login', data]); },
    },
    auditLog: { create: async ({ data }) => { calls.push(['audit', data]); if (auditError) throw new Error('audit unavailable'); } },
  };
  const db = { ...tx, $transaction: async (callback) => { calls.push(['begin']); try { const result = await callback(tx); calls.push(['commit']); return result; } catch (error) { calls.push(['rollback']); throw error; } } };
  const service = createGoogleService({ db, clientId: 'client', identity: { verify: async () => { calls.push(['verify']); return { subject: 'google1', email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }; } }, hashPassword: async (password) => { assert.ok(password.length >= 48); calls.push(['hash']); return 'random-password-hash'; }, signSession: () => { calls.push(['token']); return 'session'; }, now: () => new Date('2026-10-28T00:00:00Z') });
  return { service, calls };
}
const signup = { credential: 'google', challenge: 'challenge', name: 'Test school', slug: 'test-school', schoolCode: 'TEST' };
test('signup provisions Freemium school, scoped admin and audit in one transaction', async () => {
  const { service, calls } = fixture();
  const result = await service.authenticate('signup', signup);
  assert.equal(result.token, 'session');
  assert.deepEqual(calls.map(([name]) => name), ['verify', 'hash', 'begin', 'tenant', 'role', 'user', 'login', 'audit', 'commit', 'token']);
  const tenant = calls.find(([name]) => name === 'tenant')[1];
  assert.equal(tenant.subscriptionPlan, 'FREEMIUM');
  assert.equal(tenant.subscriptionStatus, 'ACTIVE');
  assert.equal(tenant.subscriptionEndsAt, undefined);
  assert.equal(tenant.schoolType, 'BASIC');
  assert.equal(tenant.settings.create.academicConfig.levelTemplates.length, 11);
  const user = calls.find(([name]) => name === 'user')[1];
  assert.equal(user.tenantId, 'school1');
  assert.equal(user.googleSubject, 'google1');
  assert.equal(user.userRoles.create.roleId, 'role1');
  assert.equal(calls.find(([name]) => name === 'audit')[1].action, 'GOOGLE_SIGNUP');
});
for (const [name, options, code] of [
  ['closed registration', { registration: false }, 'REGISTRATION_DISABLED'],
  ['duplicate Google account', { existing: true }, 'GOOGLE_ACCOUNT_EXISTS'],
  ['database uniqueness conflict', { uniqueError: true }, 'REGISTRATION_CONFLICT'],
]) test(`signup rejects ${name} and returns no session`, async () => {
  const { service, calls } = fixture(options);
  await assert.rejects(service.authenticate('signup', signup), { code });
  assert.ok(calls.some(([name]) => name === 'rollback'));
  assert.ok(!calls.some(([name]) => name === 'token'));
});
test('audit failure aborts signup without issuing a session', async () => {
  const { service, calls } = fixture({ auditError: true });
  await assert.rejects(service.authenticate('signup', signup), /audit unavailable/);
  assert.equal(calls.at(-1)[0], 'rollback');
});
test('returning Google user signs in without provisioning or password hashing', async () => {
  const { service, calls } = fixture({ existing: true, registration: false });
  await service.authenticate('signin', signup);
  assert.deepEqual(calls.map(([name]) => name), ['verify', 'begin', 'login', 'audit', 'commit', 'token']);
});
for (const [name, options, code] of [
  ['unlinked identity', {}, 'GOOGLE_ACCOUNT_UNAVAILABLE'],
  ['platform account', { existing: true, platform: true }, 'GOOGLE_ACCOUNT_UNAVAILABLE'],
  ['suspended school', { existing: true, inactive: true }, 'GOOGLE_ACCOUNT_UNAVAILABLE'],
]) test(`signin rejects ${name}`, async () => {
  const { service } = fixture(options);
  await assert.rejects(service.authenticate('signin', signup), { code });
});
test('public config honors the existing registration flag', async () => {
  assert.equal((await fixture({ registration: false }).service.config()).signupEnabled, false);
  assert.equal((await fixture().service.config()).signupEnabled, true);
});
test('Google callback requires exact frontend origin and JSON', () => {
  const middleware = googleRequestOrigin('http://localhost:5173');
  let result;
  middleware({ get: () => 'https://attacker.example', is: () => true }, {}, (error) => { result = error; });
  assert.equal(result.code, 'INVALID_AUTH_ORIGIN');
  middleware({ get: () => 'http://localhost:5173', is: () => false }, {}, (error) => { result = error; });
  assert.equal(result.code, 'INVALID_AUTH_ORIGIN');
  middleware({ get: () => 'http://localhost:5173', is: () => true }, {}, (error) => { result = error; });
  assert.equal(result, undefined);
});
test('rate limiter rejects excess attempts and resets after expiry', () => {
  let time = 0; let result;
  const limiter = createGoogleRateLimit({ now: () => time, limit: 1, windowMs: 1000 });
  const request = { ip: '127.0.0.1' };
  const response = { set: (key, value) => assert.deepEqual([key, value], ['Retry-After', '1']) };
  limiter(request, response, (error) => { result = error; }); assert.equal(result, undefined);
  limiter(request, response, (error) => { result = error; }); assert.equal(result.statusCode, 429);
  time = 1001;
  limiter(request, response, (error) => { result = error; }); assert.equal(result, undefined);
});

test('requested paid Google signup stays Freemium until platform approval', async () => {
  const {service,calls}=fixture();
  await service.authenticate('signup',{...signup,requestedPlan:'PROFESSIONAL',billingCycle:'ANNUAL'});
  const tenant=calls.find(([name])=>name==='tenant')[1];
  assert.equal(tenant.subscriptionPlan,'FREEMIUM');
  assert.equal(tenant.requestedSubscriptionPlan,'PROFESSIONAL');
  assert.equal(tenant.billingCycle,'ANNUAL');
  assert.equal(tenant.trialEndsAt,undefined);
});

test('expired school may sign in to renew while operational policy remains enforced separately',async()=>{await fixture({existing:true,expired:true}).service.authenticate('signin',signup);});
