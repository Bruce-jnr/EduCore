import { useState } from 'react';
import logo from '../../assets/edupalgh_logo.png';
import { Icon } from '../../components/Icon.jsx';
import { useAuth } from './useAuth.js';
import './auth.css';
import './google-auth.css';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
export function LoginPage() {
  const { login, googleAuthenticate } = useAuth();
  const [form, setForm] = useState({
    schoolSlug: 'st-andrews',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      window.location.hash =
        new URLSearchParams(window.location.search).get('payment_kind') ===
        'school'
          ? '/payment-return'
          : window.location.hash === '#/lesson-plans'
            ? '/lesson-plans'
            : '/dashboard';
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-brand">
        <div>
          <img src={logo} alt="EduPalGh" />
          <h1>Build a stronger school community.</h1>
          <p>
            One secure place for students, academics, staff, and school
            operations.
          </p>
        </div>
        <small>Secure · Tenant-isolated · Built for Ghana Education</small>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-logo">
            <img src={logo} alt="" />
            <strong>EduPalGh</strong>
          </div>
          <div>
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your school</h2>
            <p>Enter your credentials to continue.</p>
          </div>
          {error && (
            <div className="form-error">
              <Icon>error</Icon>
              {error}
            </div>
          )}
          <GoogleAuthButton
            intent="signin"
            onCredential={async (credentials) => {
              await googleAuthenticate('signin', credentials);
              window.location.hash =
                new URLSearchParams(window.location.search).get(
                  'payment_kind',
                ) === 'school'
                  ? '/payment-return'
                  : window.location.hash === '#/lesson-plans'
                    ? '/lesson-plans'
                    : '/dashboard';
            }}
          />
          <div className="auth-divider">or use your school password</div>
          <label>
            School code
            <input
              value={form.schoolSlug}
              onChange={(e) => setForm({ ...form, schoolSlug: e.target.value })}
              required
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              placeholder="admin@school.edu"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength="8"
              autoComplete="current-password"
            />
          </label>
          <button className="primary-button login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            <Icon>arrow_forward</Icon>
          </button>
          <p className="login-help">
            Starting a new school?{' '}
            <a href="#/signup">Create a school with Google</a>. Existing school
            users should contact their administrator. For personal lesson plans,{' '}
            <a href="#/teacher/login">use teacher sign in</a>.
          </p>
        </form>
      </section>
    </main>
  );
}
