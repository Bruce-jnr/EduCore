import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { api } from '../../services/api.js';

function viewModel(student) {
  const enrollment = student.enrollments?.[0];
  return {
    databaseId: student.id, id: student.studentNumber, name: `${student.firstName} ${student.lastName}`,
    initials: `${student.firstName[0]}${student.lastName[0]}`.toUpperCase(), className: enrollment ? `${enrollment.class.name}${enrollment.class.section ? ` ${enrollment.class.section}` : ''}` : 'Not enrolled',
    gender: student.gender || '—', guardian: 'Not added', phone: student.phone || '—', status: student.status[0] + student.status.slice(1).toLowerCase(),
  };
}

export function StudentsPage() {
  const [query, setQuery] = useState(''); const [result, setResult] = useState({ items: [], total: 0, pages: 1 }); const [state, setState] = useState('loading'); const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setState('loading'); api(`/students?limit=25&search=${encodeURIComponent(query)}`).then((data) => { setResult({ ...data, items: data.items.map(viewModel) }); setState('ready'); }).catch((requestError) => { setError(requestError.message); setState('error'); }); }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  return <div className="page students-page">
    <PageHeader eyebrow="Student Management" title="Students" description="Manage student records, enrollment, and class assignments." actions={<><button className="secondary-button"><Icon>upload_file</Icon>Import</button><a className="primary-button" href="#/students/new"><Icon>person_add</Icon>Add Student</a></>} />
    <section className="student-summary"><div><strong>{result.total}</strong><span>Total students</span></div><div><strong>{result.items.filter((s) => s.status === 'Active').length}</strong><span>Active on this page</span></div><div><strong>—</strong><span>New this term</span></div><div><strong>—</strong><span>Classes</span></div></section>
    <section className="panel table-panel">
      <div className="table-tools"><label className="table-search"><Icon>search</Icon><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or student ID..." /></label><div><select aria-label="Filter by class"><option>All classes</option></select><select aria-label="Filter by status"><option>All statuses</option><option>Active</option><option>Inactive</option></select><button className="filter-button"><Icon>tune</Icon>Filters</button></div></div>
      {state === 'loading' && <div className="data-state"><span className="spinner"/><p>Loading students…</p></div>}
      {state === 'error' && <div className="data-state error-state"><Icon>cloud_off</Icon><strong>Couldn’t load students</strong><p>{error}</p></div>}
      {state === 'ready' && result.items.length === 0 && <div className="data-state"><Icon>group_off</Icon><strong>No students found</strong><p>Try a different search or add your first student.</p></div>}
      {state === 'ready' && result.items.length > 0 && <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all students" /></th><th>Student</th><th>Student ID</th><th>Class</th><th>Gender</th><th>Guardian</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.items.map((student) => <tr key={student.databaseId}><td><input type="checkbox" aria-label={`Select ${student.name}`} /></td><td><a className="student-cell" href={`#/students/${student.databaseId}`}><span>{student.initials}</span><strong>{student.name}</strong></a></td><td><code>{student.id}</code></td><td>{student.className}</td><td>{student.gender}</td><td><div className="guardian-cell"><strong>{student.guardian}</strong><small>{student.phone}</small></div></td><td><span className={`status-badge ${student.status.toLowerCase()}`}>{student.status}</span></td><td><button className="icon-button" aria-label={`Actions for ${student.name}`}><Icon>more_vert</Icon></button></td></tr>)}</tbody></table></div>}
      <footer className="pagination"><p>Showing <strong>{result.items.length}</strong> of <strong>{result.total}</strong> students</p><div><button disabled><Icon>chevron_left</Icon></button><button className="current">1</button>{result.pages > 1 && <button>2</button>}<button disabled={result.pages <= 1}><Icon>chevron_right</Icon></button></div></footer>
    </section>
  </div>;
}
