import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../auth/useAuth.js';
import './guardians.css';

const blankGuardian = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  occupation: '',
  relationship: 'Parent',
  isPrimary: false,
  isEmergencyContact: false,
  isFinanciallyResponsible: false,
};
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(value))
    : 'Not provided';
export function StudentProfilePage() {
  const { user } = useAuth();
  const id = window.location.hash.split('/').pop();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [guardianForm, setGuardianForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const canAddGuardian = user.permissions?.includes('guardians.create');
  const canEditStudent = user.permissions?.includes('students.update');
  const canViewFinance = user.permissions?.includes('finance.view');
  async function load() {
    setStudent(await api(`/students/${id}`));
  }
  useEffect(() => {
    api(`/students/${id}`)
      .then(setStudent)
      .catch((requestError) => setError(requestError.message));
  }, [id]);
  async function addGuardian(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      await api(`/students/${id}/guardians`, {
        method: 'POST',
        body: JSON.stringify(guardianForm),
      });
      setGuardianForm(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }
  function beginEdit() {
    setEditForm({ studentNumber: student.studentNumber, firstName: student.firstName, middleName: student.middleName || '', lastName: student.lastName, dateOfBirth: student.dateOfBirth?.slice(0, 10) || '', gender: student.gender || '', email: student.email || '', phone: student.phone || '', address: student.address || '', admissionDate: student.admissionDate?.slice(0, 10) || '', status: student.status });
  }
  async function updateStudent(event) {
    event.preventDefault();
    try {
      setSaving(true); setError('');
      const updated = await api(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      setStudent(updated); setEditForm(null);
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  if (error && !student)
    return (
      <div className="page">
        <a className="back-link" href="#/students">
          <Icon>arrow_back</Icon>Back to students
        </a>
        <div className="panel data-state error-state">
          <Icon>error</Icon>
          <strong>Couldn’t load this student</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  if (!student)
    return (
      <div className="page data-state">
        <span className="spinner" />
        <p>Loading student profile…</p>
      </div>
    );
  const current =
    student.enrollments.find((item) => item.status === 'ACTIVE') ||
    student.enrollments[0];
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');
  const initials =
    `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
  return (
    <div className="page profile-page">
      <a className="back-link" href="#/students">
        <Icon>arrow_back</Icon>Back to students
      </a>
      {error && (
        <div className="form-error">
          <Icon>error</Icon>
          {error}
        </div>
      )}
      <section className="profile-hero panel">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-title">
          <div>
            <h1>{fullName}</h1>
            <span className={`status-badge ${student.status.toLowerCase()}`}>
              {student.status[0] + student.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p>
            <code>{student.studentNumber}</code>
            {current && (
              <>
                <span>•</span>
                {current.class.name}
                {current.class.section ? ` ${current.class.section}` : ''}
                <span>•</span>
                {current.academicYear.name}
              </>
            )}
          </p>
        </div>
        <div className="profile-actions">
          {canEditStudent && <button className="secondary-button" onClick={beginEdit}><Icon>edit</Icon>Edit student</button>}
          <button className="secondary-button" onClick={() => window.print()}><Icon>print</Icon>Print profile</button>
        </div>
      </section>
      {editForm && (
        <form className="panel guardian-form" onSubmit={updateStudent}>
          <div className="panel-heading"><div><h2>Edit Student Information</h2><p>Update the student’s identity, contact details, or record status.</p></div><button type="button" className="icon-button" onClick={() => setEditForm(null)}><Icon>close</Icon></button></div>
          <div className="form-grid">
            <Field label="Student ID"><input required value={editForm.studentNumber} onChange={(event) => setEditForm({...editForm, studentNumber: event.target.value})}/></Field>
            <Field label="First name"><input required value={editForm.firstName} onChange={(event) => setEditForm({...editForm, firstName: event.target.value})}/></Field>
            <Field label="Middle name"><input value={editForm.middleName} onChange={(event) => setEditForm({...editForm, middleName: event.target.value})}/></Field>
            <Field label="Last name"><input required value={editForm.lastName} onChange={(event) => setEditForm({...editForm, lastName: event.target.value})}/></Field>
            <Field label="Date of birth"><input type="date" value={editForm.dateOfBirth} onChange={(event) => setEditForm({...editForm, dateOfBirth: event.target.value})}/></Field>
            <Field label="Gender"><select value={editForm.gender} onChange={(event) => setEditForm({...editForm, gender: event.target.value})}><option value="">Not provided</option><option>Female</option><option>Male</option><option>Other</option></select></Field>
            <Field label="Email"><input type="email" value={editForm.email} onChange={(event) => setEditForm({...editForm, email: event.target.value})}/></Field>
            <Field label="Phone"><input value={editForm.phone} onChange={(event) => setEditForm({...editForm, phone: event.target.value})}/></Field>
            <Field label="Admission date"><input type="date" value={editForm.admissionDate} onChange={(event) => setEditForm({...editForm, admissionDate: event.target.value})}/></Field>
            <Field label="Status"><select value={editForm.status} onChange={(event) => setEditForm({...editForm, status: event.target.value})}>{['ACTIVE','INACTIVE','TRANSFERRED','WITHDRAWN','GRADUATED','SUSPENDED','ARCHIVED'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></Field>
            <label className="span-two">Residential address<textarea rows="2" value={editForm.address} onChange={(event) => setEditForm({...editForm, address: event.target.value})}/></label>
          </div>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditForm(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      )}
      {guardianForm && (
        <form className="panel guardian-form" onSubmit={addGuardian}>
          <div className="panel-heading">
            <div>
              <h2>Add Parent or Guardian</h2>
              <p>
                A matching phone number reuses the guardian record for siblings.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setGuardianForm(null)}
            >
              <Icon>close</Icon>
            </button>
          </div>
          <div className="form-grid">
            <Field label="First name">
              <input
                required
                value={guardianForm.firstName}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    firstName: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Last name">
              <input
                required
                value={guardianForm.lastName}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    lastName: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Relationship">
              <select
                value={guardianForm.relationship}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    relationship: event.target.value,
                  })
                }
              >
                {[
                  'Parent',
                  'Mother',
                  'Father',
                  'Guardian',
                  'Grandparent',
                  'Sibling',
                  'Sponsor',
                  'Other',
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input
                required
                value={guardianForm.phone}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    phone: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={guardianForm.email}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    email: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Occupation">
              <input
                value={guardianForm.occupation}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    occupation: event.target.value,
                  })
                }
              />
            </Field>
            <label className="span-two">
              Address
              <textarea
                rows="2"
                value={guardianForm.address}
                onChange={(event) =>
                  setGuardianForm({
                    ...guardianForm,
                    address: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <div className="guardian-checks">
            <Check
              label="Primary guardian"
              name="isPrimary"
              form={guardianForm}
              setForm={setGuardianForm}
            />
            <Check
              label="Emergency contact"
              name="isEmergencyContact"
              form={guardianForm}
              setForm={setGuardianForm}
            />
            <Check
              label="Financially responsible"
              name="isFinanciallyResponsible"
              form={guardianForm}
              setForm={setGuardianForm}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setGuardianForm(null)}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Add guardian'}
            </button>
          </div>
        </form>
      )}
      <div className="profile-grid">
        <div className="profile-main">
          <section className="panel detail-card">
            <div className="panel-heading">
              <h2>Personal Information</h2>
            </div>
            <dl>
              <Detail label="Full name" value={fullName} />
              <Detail
                label="Date of birth"
                value={formatDate(student.dateOfBirth)}
              />
              <Detail label="Gender" value={student.gender || 'Not provided'} />
              <Detail
                label="Admission date"
                value={formatDate(student.admissionDate)}
              />
              <Detail
                label="Email address"
                value={student.email || 'Not provided'}
              />
              <Detail
                label="Phone number"
                value={student.phone || 'Not provided'}
              />
              <Detail
                label="Residential address"
                value={student.address || 'Not provided'}
                full
              />
            </dl>
          </section>
          <section className="panel guardian-card">
            <div className="panel-heading">
              <h2>Parents & Guardians</h2>
              {canAddGuardian && (
                <button
                  className="text-button"
                  onClick={() => setGuardianForm({ ...blankGuardian })}
                >
                  Add guardian
                </button>
              )}
            </div>
            {student.guardians.length ? (
              student.guardians.map((link) => (
                <article className="guardian-record" key={link.id}>
                  <div className="guardian-profile">
                    <span>
                      {link.guardian.firstName[0]}
                      {link.guardian.lastName[0]}
                    </span>
                    <div>
                      <strong>
                        {link.guardian.firstName} {link.guardian.lastName}
                      </strong>
                      <p>
                        {link.relationship} · {link.guardian.phone}
                      </p>
                    </div>
                    {link.isPrimary && <em>Primary</em>}
                  </div>
                  <dl>
                    <Detail
                      label="Email"
                      value={link.guardian.email || 'Not provided'}
                    />
                    <Detail
                      label="Occupation"
                      value={link.guardian.occupation || 'Not provided'}
                    />
                    <Detail
                      label="Address"
                      value={link.guardian.address || 'Not provided'}
                      full
                    />
                  </dl>
                  <div className="guardian-flags">
                    {link.isEmergencyContact && (
                      <span>
                        <Icon>emergency</Icon>Emergency contact
                      </span>
                    )}
                    {link.isFinanciallyResponsible && (
                      <span>
                        <Icon>payments</Icon>Financially responsible
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-inline">
                <Icon>family_restroom</Icon>
                <div>
                  <strong>No guardian linked yet</strong>
                  <p>Add a parent or guardian to this student record.</p>
                </div>
              </div>
            )}
          </section>
          <section className="panel trajectory">
            <div className="panel-heading">
              <div>
                <h2>Academic Trajectory</h2>
                <p>Historical enrollments remain preserved.</p>
              </div>
            </div>
            {student.enrollments.length ? (
              <div className="timeline">
                {student.enrollments.slice(0, 3).map((enrollment) => (
                  <div key={enrollment.id}>
                    <i />
                    <span>{enrollment.academicYear.name}</span>
                    <strong>
                      {enrollment.class.name}
                      {enrollment.class.section
                        ? ` ${enrollment.class.section}`
                        : ''}
                    </strong>
                    <small>
                      {enrollment.status === 'ACTIVE'
                        ? 'Current enrollment'
                        : enrollment.status}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                <Icon>school</Icon>
                <div>
                  <strong>Not enrolled</strong>
                  <p>Assign this student to an academic year and class.</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="profile-aside">
          {canViewFinance && <section className="panel student-ledger-card"><div className="panel-heading"><h2>Financial Ledger</h2></div><div className="attendance-score unavailable"><Icon>account_balance_wallet</Icon><span>View charges, payments, discounts, and outstanding balance.</span></div><a className="secondary-button full-button" href={`#/finance/ledger/${id}`}><Icon>receipt_long</Icon>Open student ledger</a></section>}
          <section className="panel attendance-card">
            <div className="panel-heading">
              <h2>Attendance</h2>
            </div>
            <div className="attendance-score unavailable">
              <strong>—</strong>
              <span>Open Attendance for current records</span>
            </div>
          </section>
          <section className="panel activity-side">
            <div className="panel-heading">
              <h2>Record Information</h2>
            </div>
            <div>
              <span>
                <Icon>calendar_add_on</Icon>
              </span>
              <p>
                <strong>Student record created</strong>
                <small>{formatDate(student.createdAt)}</small>
              </p>
            </div>
            <div>
              <span>
                <Icon>update</Icon>
              </span>
              <p>
                <strong>Last profile update</strong>
                <small>{formatDate(student.updatedAt)}</small>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
function Check({ label, name, form, setForm }) {
  return (
    <label>
      <input
        type="checkbox"
        checked={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.checked })}
      />
      {label}
    </label>
  );
}
function Detail({ label, value, full }) {
  return (
    <div className={full ? 'full' : ''}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
