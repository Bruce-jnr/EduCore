import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { api } from '../../services/api.js';

const initialForm = { studentNumber: '', firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', email: '', phone: '', address: '', admissionDate: '', academicYearId: '', classId: '' };

export function AddStudentPage() {
  const [form, setForm] = useState(initialForm); const [options, setOptions] = useState({ academicYears: [], classes: [] }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { api('/academics/options').then((data) => { setOptions(data); const year = data.academicYears.find((item) => item.isCurrent) || data.academicYears[0]; if (year) setForm((current) => ({ ...current, academicYearId: year.id })); }).catch((requestError) => setError(requestError.message)); }, []);
  const visibleClasses = options.classes.filter((item) => !form.academicYearId || item.academicYearId === form.academicYearId);
  function change(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
    try { const student = await api('/students', { method: 'POST', body: JSON.stringify(body) }); window.location.hash = `/students/${student.id}`; } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return <div className="page add-student-page"><a className="back-link" href="#/students"><Icon>arrow_back</Icon>Back to students</a><PageHeader eyebrow="Student Management" title="Add Student" description="Create the student record and optionally assign the current class." />
    <form className="student-form" onSubmit={submit}>{error && <div className="form-error form-wide"><Icon>error</Icon>{error}</div>}
      <section className="panel form-section"><div className="form-section-heading"><span><Icon>person</Icon></span><div><h2>Personal Information</h2><p>Enter the student’s official details.</p></div></div><div className="form-grid"><label>Student ID <input name="studentNumber" value={form.studentNumber} onChange={change} required placeholder="STD-2026-004" /></label><label>First name <input name="firstName" value={form.firstName} onChange={change} required /></label><label>Middle name <input name="middleName" value={form.middleName} onChange={change} /></label><label>Last name <input name="lastName" value={form.lastName} onChange={change} required /></label><label>Date of birth <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} /></label><label>Gender <select name="gender" value={form.gender} onChange={change}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label></div></section>
      <section className="panel form-section"><div className="form-section-heading"><span><Icon>contact_phone</Icon></span><div><h2>Contact Information</h2><p>Optional direct contact details.</p></div></div><div className="form-grid"><label>Email address <input type="email" name="email" value={form.email} onChange={change} /></label><label>Phone number <input name="phone" value={form.phone} onChange={change} /></label><label className="span-two">Residential address <textarea name="address" value={form.address} onChange={change} rows="3" /></label></div></section>
      <section className="panel form-section"><div className="form-section-heading"><span><Icon>school</Icon></span><div><h2>Enrollment</h2><p>Assign the student without overwriting future history.</p></div></div><div className="form-grid"><label>Admission date <input type="date" name="admissionDate" value={form.admissionDate} onChange={change} /></label><label>Academic year <select name="academicYearId" value={form.academicYearId} onChange={change}><option value="">Select academic year</option>{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? ' · Current' : ''}</option>)}</select></label><label>Class <select name="classId" value={form.classId} onChange={change}><option value="">Assign later</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` ${item.section}` : ''}</option>)}</select></label></div></section>
      <footer className="form-actions"><a className="secondary-button" href="#/students">Cancel</a><button className="primary-button" disabled={saving}>{saving ? 'Creating student…' : 'Create student'}<Icon>arrow_forward</Icon></button></footer>
    </form>
  </div>;
}
