export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
export function assetUrl(value) {
  if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  const serverUrl = API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${serverUrl}/${value.replace(/^\//, '')}`;
}
export async function api(path, options = {}) {
  const token = localStorage.getItem('edupalgh_token');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers } });
  const payload = await response.json().catch(() => ({ message: 'The server returned an invalid response' }));
  if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('edupalgh:unauthorized')); throw new Error(payload.message || 'Request failed'); }
  return payload.data;
}
