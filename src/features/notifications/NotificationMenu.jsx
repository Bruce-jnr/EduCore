import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { api } from '../../services/api.js';
import './notifications.css';

const icons = { APPROVAL_REQUIRED: 'approval', APPROVED: 'task_alt', REJECTED: 'assignment_return', FINANCE_REVIEW: 'receipt_long', SUBSCRIPTION_EXPIRING: 'schedule', SYSTEM: 'info' };

export function NotificationMenu() {
  const [data, setData] = useState({ items: [], unread: 0 }); const [open, setOpen] = useState(false); const menuRef = useRef(null);
  const load = useCallback(() => api('/notifications').then(setData).catch(() => {}), []);
  useEffect(() => { load(); const interval = setInterval(load, 60000); return () => clearInterval(interval); }, [load]);
  useEffect(() => { function close(event) { if (!menuRef.current?.contains(event.target)) setOpen(false); } document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  async function openItem(item) { if (!item.readAt) { await api(`/notifications/${item.id}/read`, { method: 'PATCH' }); setData((current) => ({ ...current, unread: Math.max(0, current.unread - 1), items: current.items.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry) })); } setOpen(false); if (item.link) window.location.assign(item.link); }
  async function markAll() { await api('/notifications/read-all', { method: 'PATCH' }); setData((current) => ({ unread: 0, items: current.items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })) })); }
  return <div className="notification-menu" ref={menuRef}><button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`} aria-expanded={open}><Icon>notifications</Icon>{data.unread > 0 && <b>{data.unread > 99 ? '99+' : data.unread}</b>}</button>{open && <section className="notification-popover"><header><div><strong>Notifications</strong><span>{data.unread} unread</span></div>{data.unread > 0 && <button onClick={markAll}>Mark all read</button>}</header><div className="notification-list">{data.items.map((item) => <button key={item.id} className={item.readAt ? '' : 'unread'} onClick={() => openItem(item)}><i><Icon>{icons[item.type] || 'notifications'}</Icon></i><span><strong>{item.title}</strong><small>{item.message}</small><time>{relativeTime(item.createdAt)}</time></span></button>)}{!data.items.length && <div className="notification-empty"><Icon>notifications_none</Icon><strong>You’re all caught up</strong><span>New approvals and account alerts will appear here.</span></div>}</div></section>}</div>;
}

function relativeTime(value) { const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return 'Just now'; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }
