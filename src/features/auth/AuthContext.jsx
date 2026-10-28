import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { AuthContext } from './auth-context.js';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('edupalgh_user') || 'null'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('edupalgh_token')));
  function logout() { localStorage.removeItem('edupalgh_token'); localStorage.removeItem('edupalgh_user'); setUser(null); setLoading(false); }
  useEffect(() => {
    const unauthorized = () => logout(); window.addEventListener('edupalgh:unauthorized', unauthorized);
    if (localStorage.getItem('edupalgh_token')) { const stored=JSON.parse(localStorage.getItem('edupalgh_user')||'null'); api(stored?.isPlatformUser?'/platform/auth/me':'/auth/me').then((data) => setUser((current) => ({ ...current, ...data }))).catch(logout).finally(() => setLoading(false)); }
    return () => window.removeEventListener('edupalgh:unauthorized', unauthorized);
  }, []);
  async function login(credentials) { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); localStorage.setItem('edupalgh_token', data.token); localStorage.setItem('edupalgh_user', JSON.stringify(data.user)); setUser(data.user); }
  async function platformLogin(credentials) { const data=await api('/platform/auth/login',{method:'POST',body:JSON.stringify(credentials)});localStorage.setItem('edupalgh_token',data.token);localStorage.setItem('edupalgh_user',JSON.stringify(data.user));setUser(data.user); }
  async function googleAuthenticate(intent, body) { const data = await api(`/auth/google/${intent}`, { method: 'POST', body: JSON.stringify(body) }); localStorage.setItem('edupalgh_token', data.token); localStorage.setItem('edupalgh_user', JSON.stringify(data.user)); setUser(data.user); }
  return <AuthContext.Provider value={{ user, loading, login, platformLogin, googleAuthenticate, logout }}>{children}</AuthContext.Provider>;
}
