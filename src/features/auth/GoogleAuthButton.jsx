import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
let sdk;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!sdk) sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google.accounts.id);
    script.onerror = () => { script.remove(); sdk = null; reject(new Error('Google could not load. Check your connection and try again.')); };
    document.head.appendChild(script);
  });
  return sdk;
}
export function GoogleAuthButton({ intent, onCredential, enabled = true, authPath = '/auth/google', request = api }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  useEffect(() => {
    let cancelled = false;
    const target = container.current;
    target.replaceChildren();
    async function setup() {
      try {
        const config = await request(`${authPath}/config`);
        if (cancelled) return;
        if (!config.clientId) { setMessage('Google sign-in is not configured yet.'); return; }
        if (intent === 'signup' && !config.signupEnabled) { setMessage('New school registration is currently closed. Contact the platform administrator.'); return; }
        if (!enabled) { setMessage('Complete your details to continue with Google.'); return; }
        setMessage('Loading Google…');
        const [{ challenge }, google] = await Promise.all([request(`${authPath}/challenge`, { method: 'POST', body: JSON.stringify({ intent }) }), loadGoogle()]);
        if (cancelled) return;
        google.initialize({ client_id: config.clientId, nonce: challenge, auto_select: false, use_fedcm_for_button: true, callback: async ({ credential }) => {
          if (cancelled) return;
          setBusy(true);
          try { await callback.current({ credential, challenge }); }
          catch (error) { if (!cancelled) { setMessage(error.message); target.replaceChildren(); } }
          finally { if (!cancelled) setBusy(false); }
        } });
        google.renderButton(target, { theme: 'outline', size: 'large', text: intent === 'signup' ? 'signup_with' : 'signin_with', width: Math.min(400, target.clientWidth || 320) });
        setMessage('');
      } catch (error) { if (!cancelled) setMessage(error.message); }
    }
    setup();
    return () => { cancelled = true; target.replaceChildren(); };
  }, [intent, enabled, attempt, authPath, request]);
  return <div className="google-auth" aria-busy={busy}>
    <div ref={container} style={busy ? { pointerEvents: 'none', opacity: 0.5 } : undefined} />
    <p role="status">{busy ? 'Signing you in…' : message}</p>
    {message && enabled && <button type="button" className="google-retry" onClick={() => setAttempt((value) => value + 1)}>Refresh Google sign-in</button>}
  </div>;
}
