import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../auth/useAuth.js';

export function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalStudents: '—',
    activeStudents: '—',
    totalStaff: '—',
    totalClasses: '—',
  });
  useEffect(() => {
    api('/dashboard')
      .then(setMetrics)
      .catch(() => {});
  }, []);
  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const activeWidth = Number(metrics.totalStudents)
    ? `${Math.min(100, (Number(metrics.activeStudents) / Number(metrics.totalStudents)) * 100)}%`
    : '0%';
  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={date}
        title={`Welcome, ${user.firstName}`}
        description={`Here’s what’s happening at ${user.tenant?.name || 'your school'} today.`}
        actions={
          <a className="primary-button" href="#/students/new">
            <Icon>add</Icon>Add student
          </a>
        }
      />
      <section className="stats-grid">
        <StatCard
          icon="groups"
          label="Total Students"
          value={metrics.totalStudents}
          trend={`${metrics.activeStudents} active`}
        />
        <StatCard
          icon="badge"
          label="Total Staff"
          value={metrics.totalStaff}
          trend="Active staff records"
          tone="violet"
        />
        <StatCard
          icon="school"
          label="Active Classes"
          value={metrics.totalClasses}
          trend="Current academic structure"
          tone="green"
        />
        <StatCard
          icon="how_to_reg"
          label="Attendance Today"
          value="—"
          trend="Attendance module coming next"
          tone="amber"
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Enrollment Overview</h2>
              <p>Live student record summary</p>
            </div>
            <a className="text-button" href="#/students">
              View students
            </a>
          </div>
          <div className="overview-bars">
            <div>
              <span>Total enrollment</span>
              <strong>{metrics.totalStudents}</strong>
              <i>
                <b style={{ width: '100%' }} />
              </i>
            </div>
            <div>
              <span>Active students</span>
              <strong>{metrics.activeStudents}</strong>
              <i>
                <b style={{ width: activeWidth }} />
              </i>
            </div>
          </div>
        </article>
        <article className="panel setup-panel">
          <div className="panel-heading">
            <div>
              <h2>MVP Setup</h2>
              <p>Foundation progress</p>
            </div>
          </div>
          <ul>
            {[
              'School and administrator',
              'Tenant-safe authentication',
              'Academic year and class',
              'Student records',
            ].map((item) => (
              <li className="done" key={item}>
                <Icon>check_circle</Icon>
                <span>{item}</span>
              </li>
            ))}
            <li>
              <Icon>radio_button_unchecked</Icon>
              <span>Staff and teacher assignments</span>
            </li>
          </ul>
        </article>
      </section>
      <section className="quick-actions panel">
        <div>
          <h2>Quick Actions</h2>
          <p>Continue school setup</p>
        </div>
        <div className="quick-grid">
          <a href="#/students/new">
            <Icon>person_add</Icon>
            <span>Add Student</span>
          </a>
          <a href="#/students">
            <Icon>groups</Icon>
            <span>View Students</span>
          </a>
          <button disabled>
            <Icon>badge</Icon>
            <span>Add Staff</span>
          </button>
          <button disabled>
            <Icon>school</Icon>
            <span>Create Class</span>
          </button>
        </div>
      </section>
      <section className="lower-grid">
        <article className="panel next-steps">
          <div className="panel-heading">
            <div>
              <h2>Next implementation steps</h2>
              <p>Following the approved MVP order</p>
            </div>
          </div>
          <div className="next-step-list">
            {[
              [
                '01',
                'Staff management',
                'Add staff profiles and employee records.',
              ],
              [
                '02',
                'Academic management',
                'Manage years, periods, classes, and subjects.',
              ],
              [
                '03',
                'Guardian records',
                'Link multiple guardians to each student.',
              ],
            ].map(([number, title, detail]) => (
              <div key={number}>
                <span>{number}</span>
                <p>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel tenant-card">
          <span className="tenant-mark">
            <Icon>domain</Icon>
          </span>
          <h2>{user.tenant?.name}</h2>
          <p>
            School code: <strong>{user.tenant?.slug}</strong>
          </p>
          <span className="security-note">
            <Icon>verified_user</Icon>Tenant isolation active
          </span>
        </article>
      </section>
    </div>
  );
}
