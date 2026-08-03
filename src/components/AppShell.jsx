import { useState } from 'react';
import logo from '../assets/educore_logo.png';
import { Icon } from './Icon.jsx';

const groups = [
  {
    label: 'Main',
    items: [{ label: 'Dashboard', icon: 'dashboard', href: '#/dashboard' }],
  },
  {
    label: 'Students',
    items: [
      { label: 'All Students', icon: 'group', href: '#/students' },
      {
        label: 'Attendance',
        icon: 'fact_check',
        href: '#/attendance',
      },
    ],
  },
  {
    label: 'Academics',
    items: [
      {
        label: 'Classes',
        icon: 'school',
        href: '#/academics/classes',
      },
      {
        label: 'Subjects',
        icon: 'menu_book',
        href: '#/academics/subjects',
      },
      {
        label: 'Academic Years',
        icon: 'calendar_month',
        href: '#/academics/years',
      },
      { label: 'Terms / Semesters', icon: 'date_range', href: '#/academics/periods' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Bills & Invoices', icon: 'receipt_long', href: '#/finance/bills' },
      { label: 'Fees', icon: 'price_change', href: '#/finance/fees' },
      { label: 'Payments', icon: 'payments', href: '#/finance/payments' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Staff', icon: 'badge', href: '#/staff' },
      {
        label: 'Users & Roles',
        icon: 'admin_panel_settings',
        href: '#/users',
      },
      {
        label: 'School Settings',
        icon: 'settings',
        href: '#/settings',
      },
    ],
  },
];

export function AppShell({ route, children, user, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <a className="brand" href="#/dashboard" onClick={() => setOpen(false)}>
          <img src={logo} alt="EduCore" />
          <span>
            <strong>EduCore</strong>
            <small>St. Andrews Excellence</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          {groups.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active =
                  route === item.href.slice(1) ||
                  (item.href === '#/students' && route.startsWith('/students'));
                return (
                  <a
                    key={item.label}
                    href={item.disabled ? undefined : item.href}
                    className={`${active ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon>{item.icon}</Icon>
                    <span>{item.label}</span>
                    {item.disabled && <em>Soon</em>}
                  </a>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="sidebar-help">
          <Icon>help</Icon>
          <div>
            <strong>Need help?</strong>
            <span>Visit the help centre</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Icon>menu</Icon>
          </button>
          <label className="global-search">
            <Icon>search</Icon>
            <input
              aria-label="Search"
              placeholder="Search students, staff, or records..."
            />
          </label>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Icon>notifications</Icon>
              <i />
            </button>
            <button className="profile-menu" onClick={onLogout} title="Sign out">
              <span>{`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`}</span>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <small>{user.roles?.[0] || 'School user'} · Sign out</small>
              </div>
              <Icon>logout</Icon>
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
