import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { AuthContext } from './auth-context.js';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('educore_user') || 'null'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('educore_token')));
  function logout() { localStorage.removeItem('educore_token'); localStorage.removeItem('educore_user'); setUser(null); setLoading(false); }
  useEffect(() => {
    const unauthorized = () => logout(); window.addEventListener('educore:unauthorized', unauthorized);
    if (localStorage.getItem('educore_token')) { const stored=JSON.parse(localStorage.getItem('educore_user')||'null'); api(stored?.isPlatformUser?'/platform/auth/me':'/auth/me').then((data) => setUser((current) => ({ ...current, ...data }))).catch(logout).finally(() => setLoading(false)); }
    return () => window.removeEventListener('educore:unauthorized', unauthorized);
  }, []);
  async function login(credentials) { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); localStorage.setItem('educore_token', data.token); localStorage.setItem('educore_user', JSON.stringify(data.user)); setUser(data.user); }
  async function platformLogin(credentials) { const data=await api('/platform/auth/login',{method:'POST',body:JSON.stringify(credentials)});localStorage.setItem('educore_token',data.token);localStorage.setItem('educore_user',JSON.stringify(data.user));setUser(data.user); }
  return <AuthContext.Provider value={{ user, loading, login, platformLogin, logout }}>{children}</AuthContext.Provider>;
}
