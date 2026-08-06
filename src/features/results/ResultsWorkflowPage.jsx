import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../auth/useAuth.js';
import './workflow.css';
import './workflow-review.css';

export function ResultsWorkflowPage() {
  const { user } = useAuth(); const [sheets, setSheets] = useState([]); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState('');
  const isAdministrator = user.roles?.some((role) => role === 'School Administrator' || role === 'Academic Administrator'); const canSubmit = !isAdministrator && user.permissions?.includes('results.submit'); const canApprove = isAdministrator && user.permissions?.includes('results.approve'); const canPublish = isAdministrator && user.permissions?.includes('results.publish');
  async function load() { try { setSheets((await api('/results')).recentSheets); } catch (requestError) { setError(requestError.message); } }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  async function action(sheet, operation) { let reason; if (operation === 'reject') { reason = window.prompt('Why are these results being returned to the teacher?'); if (!reason) return; } try { setBusy(`${sheet.id}:${operation}`); setError(''); await api(`/results/sheets/${sheet.id}/${operation}`, { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) }); setNotice(`Result sheet ${operation === 'submit' ? 'submitted' : operation === 'approve' ? 'approved' : operation === 'publish' ? 'published' : 'returned to the teacher'}.`); await load(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } }
  const statuses = isAdministrator ? ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED'] : ['DRAFT', 'SUBMITTED', 'REJECTED'];
  return <div className="page results-workflow"><PageHeader eyebrow="Academic Records" title={isAdministrator ? 'Review Teacher Scores' : 'Submit Scores'} description={isAdministrator ? 'Review score sheets submitted by teachers and approve them for report-card printing.' : 'Submit completed score sheets to the school administrator for review.'} actions={!isAdministrator ? <a className="secondary-button" href="#/results"><Icon>edit_note</Icon>Score entry</a> : null} />{error && <div className="form-error"><Icon>error</Icon>{error}</div>}{notice && <div className="success-banner"><Icon>check_circle</Icon>{notice}</div>}<section className="workflow-board">{statuses.map((status) => <div className="workflow-column" key={status}><header><span>{status}</span><b>{sheets.filter((sheet) => sheet.status === status).length}</b></header>{sheets.filter((sheet) => sheet.status === status).map((sheet) => <article className="panel" key={sheet.id}><div className="workflow-title"><Icon>{status === 'PUBLISHED' ? 'verified' : status === 'REJECTED' ? 'error' : 'description'}</Icon><div><strong>{sheet.subject.name}</strong><span>{sheet.class.name} {sheet.class.section || ''} · {sheet.academicPeriod.name}</span></div></div><p>{sheet._count.entries} scores · Submitted by {sheet.enteredBy.firstName} {sheet.enteredBy.lastName}</p>{isAdministrator && <ScoreReview sheet={sheet} />}{sheet.rejectionReason && <div className="rejection-note">{sheet.rejectionReason}</div>}<footer>{canSubmit && ['DRAFT', 'REJECTED'].includes(status) && <button className="primary-button" disabled={busy} onClick={() => action(sheet, 'submit')}>Submit to administrator</button>}{canApprove && status === 'SUBMITTED' && <><button className="secondary-button" disabled={busy} onClick={() => action(sheet, 'reject')}>Return to teacher</button><button className="primary-button" disabled={busy} onClick={() => action(sheet, 'approve')}>Approve for report cards</button></>}{canPublish && status === 'APPROVED' && <a className="primary-button" href="#/results/report-cards"><Icon>description</Icon>Open report cards</a>}</footer></article>)}</div>)}</section>{!sheets.length && <div className="panel data-state"><Icon>grading</Icon><strong>{isAdministrator ? 'No teacher submissions to review' : 'No result sheets yet'}</strong><p>{isAdministrator ? 'Submitted score sheets will appear here.' : 'Save a score-entry draft first.'}</p></div>}</div>;
}

function ScoreReview({ sheet }) {
  const students = new Map();
  for (const entry of sheet.entries || []) {
    if (!students.has(entry.student.id)) students.set(entry.student.id, { student: entry.student, scores: new Map() });
    students.get(entry.student.id).scores.set(entry.assessmentComponent.id, entry.rawScore);
  }
  const components = sheet.assessmentScheme?.components || [];
  return <details className="score-review"><summary>Review submitted scores</summary><div className="table-scroll"><table><thead><tr><th>Student</th>{components.map((component) => <th key={component.id}>{component.name} / {Number(component.maximumScore)}</th>)}</tr></thead><tbody>{[...students.values()].map(({ student, scores }) => <tr key={student.id}><td><strong>{student.firstName} {student.lastName}</strong><small>{student.studentNumber}</small></td>{components.map((component) => <td key={component.id}>{scores.get(component.id) ?? '—'}</td>)}</tr>)}</tbody></table></div></details>;
}
