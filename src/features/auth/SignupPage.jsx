import { useState } from 'react';
import logo from '../../assets/edupalgh_logo.png';
import { SCHOOL_PLANS, money, planPrice } from '../../../shared/pricing.js';
import { useAuth } from './useAuth.js';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import './auth.css';
import './google-auth.css';
import '../pricing/pricing.css';
function initialPricing() { try { const value = JSON.parse(sessionStorage.getItem('edupalgh_pricing_selection') || 'null'); return { requestedPlan: SCHOOL_PLANS[value?.plan] ? value.plan : 'FREEMIUM', billingCycle: value?.cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY' }; } catch { return { requestedPlan: 'FREEMIUM', billingCycle: 'MONTHLY' }; } }
export function SignupPage() {
  const { googleAuthenticate } = useAuth();
  const [form, setForm] = useState({ name: '', slug: '', schoolCode: '', ...initialPricing() });
  const valid = form.name.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) && form.slug.length >= 2 && /^[A-Z0-9-]{2,30}$/.test(form.schoolCode);
  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  return <main className="login-page signup-page">
    <section className="login-brand"><div><img src={logo} alt="EduPalGh" /><h1>Your school, connected.</h1><p>Create a new school workspace and begin with Freemium as its administrator.</p></div><small>Students · Academics · Staff · School operations</small></section>
    <section className="login-form-wrap"><div className="login-card signup-card">
      <a href="#/" className="signup-back">← Back to home</a>
      <div><span className="eyebrow">Start with your school</span><h2>Create your school</h2><p>Enter your school details, then sign up with Google.</p></div>
      <section className="pricing-summary-banner"><strong>{SCHOOL_PLANS[form.requestedPlan].name} · {money(planPrice(form.requestedPlan,form.billingCycle))}{['STARTER','PROFESSIONAL'].includes(form.requestedPlan) ? ` / ${form.billingCycle==='ANNUAL'?'year':'month'}` : ''}</strong><p>{form.requestedPlan==='FREEMIUM'?'50 students and 5 staff, without a subscription expiry.':'Your school starts on Freemium. The requested paid plan requires platform approval before its 14-day trial begins.'}</p><a href="#/pricing">Compare plan details</a></section>
      <label>Requested school plan<select value={form.requestedPlan} onChange={event=>change('requestedPlan',event.target.value)}>{Object.entries(SCHOOL_PLANS).map(([key,item])=><option key={key} value={key}>{item.name}</option>)}</select></label>
      <label>Billing period<select value={form.billingCycle} onChange={event=>change('billingCycle',event.target.value)}><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select></label>
      <label>School name<input value={form.name} maxLength={150} minLength={2} required autoComplete="organization" onChange={(event) => change('name', event.target.value)} placeholder="Example Basic School" /></label>
      <label>School sign-in address<input value={form.slug} maxLength={80} minLength={2} required pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(event) => change('slug', event.target.value.toLowerCase().trim())} placeholder="example-school" /><small>Use lowercase letters, numbers, and hyphens. This must be unique.</small></label>
      <label>School code<input value={form.schoolCode} maxLength={30} minLength={2} required pattern="[A-Z0-9-]+" onChange={(event) => change('schoolCode', event.target.value.toUpperCase().trim())} placeholder="EXAMPLE" /><small>A unique code for your school records.</small></label>
      <p className="signup-note">This creates a new basic school. Your Google account becomes its administrator; paid-plan requests are reviewed separately. To join an existing school, contact that school’s administrator.</p>
      <GoogleAuthButton intent="signup" enabled={valid} onCredential={async (credentials) => { await googleAuthenticate('signup', { ...form, ...credentials }); window.location.hash = '/dashboard'; }} />
      <p className="login-help">Already registered? <a href="#/login">Sign in</a></p>
    </div></section>
  </main>;
}
