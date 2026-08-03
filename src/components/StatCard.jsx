import { Icon } from './Icon.jsx';

export function StatCard({ icon, label, value, trend, tone = 'blue' }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon>{icon}</Icon></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className={trend?.startsWith('+') ? 'positive' : ''}>{trend}</small></div></article>;
}
