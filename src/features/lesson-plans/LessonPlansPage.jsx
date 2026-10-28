import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Icon } from '../../components/Icon.jsx';
import { LessonExportPayment } from '../teachers/LessonExportPayment.jsx';
import { teacherApi } from '../teachers/teacher-api.js';
import { api } from '../../services/api.js';
import { useAuth } from '../auth/useAuth.js';
import './lesson-plans.css';
import { LESSON_LIBRARY_KEY, readLibrarySelection, prefillLibraryBooklet } from './ghana-curriculum.js';

const weekFields = [
  ['topic', 'Topic', 'Weekly topic from your scheme of learning'],
  ['strand', 'Strand', 'Curriculum strand'],
  ['subStrand', 'Sub-strand', 'Curriculum sub-strand'],
  ['contentStandard', 'Content standard', 'Verified curriculum code and description'],
  ['indicator', 'Indicator', 'Verified curriculum indicator code'],
  ['performanceIndicator', 'Learning outcome / performance indicator', 'What should learners be able to demonstrate?'],
  ['coreCompetencies', 'Core competencies', 'Competencies developed during this lesson'],
  ['resources', 'Teaching and learning resources', 'Materials available to your learners'],
  ['keywords', 'Keywords', 'Key vocabulary for the week'],
  ['starter', 'Phase 1 · Starter', 'Activate prior knowledge and introduce the topic'],
  ['mainActivity', 'Phase 2 · Main learning activity', 'Describe teacher and learner activities, examples, and differentiation'],
  ['assessment', 'Assessment', 'How will you check understanding?'],
  ['plenary', 'Phase 3 · Plenary', 'Summarize learning and identify next steps'],
  ['reflection', 'Teacher reflection', 'Record reflections after teaching'],
];
const multiline = new Set(['performanceIndicator', 'coreCompetencies', 'resources', 'starter', 'mainActivity', 'assessment', 'plenary', 'reflection']);
const emptyLibrary = { items: [], total: 0, page: 1, pages: 0 };

function Booklet({ document, onClose, onDownload }) {
  return <section className="lesson-booklet" aria-label="Lesson booklet preview">
    <div className="lesson-print-toolbar">
      <button className="secondary-button" onClick={onClose}><Icon>arrow_back</Icon>Back to editor</button>
      <span>{document.status === 'READY' ? 'Ready for classroom use' : `${document.status} · Review before classroom use`}</span>
      <button className="secondary-button" onClick={onDownload}><Icon>download</Icon>Download JSON</button>
      <button className="primary-button" onClick={() => window.print()}><Icon>print</Icon>Print / Save as PDF</button>
    </div>
    <article className="lesson-paper lesson-cover">
      <span className="lesson-cover-kicker">{document.school.schoolCode} · {document.status}</span>
      <h1>{document.school.name}</h1>
      <p>{[document.school.address, document.school.city, document.school.country].filter(Boolean).join(', ')}</p>
      <div className="lesson-cover-title"><Icon>auto_stories</Icon><h2>{document.title}</h2><p>Term scheme and weekly lesson notes</p></div>
      <dl>{[['Class', `${document.class.name} ${document.class.section || ''}`], ['Subject', document.subject.name], ['Academic year', document.period.academicYear.name], ['Term', document.period.name], ['Teacher', document.teacher], ['Weeks', document.weekCount]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="lesson-document-note">{document.notice}</p>
    </article>
    <article className="lesson-paper lesson-scheme"><h2>Term scheme overview</h2><p>{document.subject.name} · {document.period.name}</p><div className="table-scroll"><table><thead><tr><th>Week</th><th>Topic</th><th>Strand / sub-strand</th><th>Standard / indicator</th></tr></thead><tbody>{document.scheme.map(week => <tr key={week.week}><td>{week.week}</td><td>{week.topic || 'Not entered'}</td><td>{[week.strand, week.subStrand].filter(Boolean).join(' / ') || 'Not entered'}</td><td>{[week.contentStandard, week.indicator].filter(Boolean).join(' / ') || 'Not entered'}</td></tr>)}</tbody></table></div></article>
    {document.weeks.map(week => <article className="lesson-paper lesson-week-paper" key={week.week}>
      <header><div><span>Week {week.week} · {week.durationMinutes} minutes</span><h2>{week.topic || 'Topic not entered'}</h2></div><p>{document.subject.name}<br />{document.class.name} · {document.period.name}</p></header>
      <dl className="lesson-curriculum-fields">{weekFields.slice(1, 9).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{week[key] || 'Not entered'}</dd></div>)}</dl>
      {weekFields.slice(9).map(([key, label]) => <section className="lesson-phase" key={key}><h3>{label}</h3><p>{week[key] || 'Not entered'}</p></section>)}
      <footer>{document.school.name} · {document.teacher} · Week {week.week}</footer>
    </article>)}
  </section>;
}

export function LessonPlansPage({ mode = 'school', teacherUser = null }) {
  const { user: schoolUser } = useAuth();
  const user = mode === 'personal' ? teacherUser : schoolUser;
  const request = mode === 'personal' ? teacherApi : api;
  const canManage = user.permissions?.includes('lesson-plans.manage');
  const canReview = user.permissions?.includes('lesson-plans.review');
  const [libraryChoice, setLibraryChoice] = useState(() => readLibrarySelection(sessionStorage));
  const [options, setOptions] = useState(null);
  const [library, setLibrary] = useState(emptyLibrary);
  const [filters, setFilters] = useState({ search: '', scope: 'mine', status: '', page: 1 });
  const [refresh, setRefresh] = useState(0);
  const [newForm, setNewForm] = useState(null);
  const [plan, setPlan] = useState(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exportUnlocked,setExportUnlocked]=useState(false);
  const [booklet, setBooklet] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    request('/lesson-plans/options', { signal: controller.signal }).then(setOptions).catch(requestError => {
      if (requestError.name !== 'AbortError') setError(requestError.message);
    });
    return () => controller.abort();
  }, [request]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ search: filters.search, scope: filters.scope, page: String(filters.page), limit: '20', ...(filters.status && { status: filters.status }) });
      request(`/lesson-plans?${query}`, { signal: controller.signal }).then(setLibrary).catch(requestError => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, refresh, request]);
  useEffect(() => {
    if (!dirty) return undefined;
    const preventLoss = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const canEdit = canManage && plan?.author.id === user.id;
  function canLeave() { return !dirty || window.confirm('Discard unsaved changes to this booklet?'); }
  function begin() {
    if (!canLeave() || !options) return;
    setExportUnlocked(false);
    const period = options.academicPeriods.find(item => item.isCurrent) || options.academicPeriods[0];
    setNewForm({ ...(mode === 'personal' && { academicYearName: `${new Date().getFullYear()}/${new Date().getFullYear()+1}` }), title: '', academicPeriodId: period?.id || '', classId: '', subjectId: '', weekCount: 12, durationMinutes: 60, topicText: '' });
    if (libraryChoice) setNewForm(current => ({ ...current, ...prefillLibraryBooklet(options, mode==='personal'&&libraryChoice.level.slug.startsWith('shs-')?{...libraryChoice,period:libraryChoice.period.replace('term-','semester-')}:libraryChoice, canReview), ...(mode==='personal'&&libraryChoice.level.slug.startsWith('shs-')&&{weekCount:16}) }));
    setPlan(null); setDirty(false); setNotice(''); setError('');
  }
  async function open(id) {
    if (!canLeave()) return;
    try { setBusy(true); setError(''); const data = await request(`/lesson-plans/${id}`); setExportUnlocked(false); setPlan(data); setNewForm(null); setWeekIndex(0); setDirty(false); setNotice(''); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  async function create(event) {
    event.preventDefault();
    try {
      setBusy(true); setError('');
      const { topicText, ...input } = newForm;
      const topics = topicText.trim() ? topicText.replace(/\r/g, '').split('\n') : [];
      const data = await request('/lesson-plans', { method: 'POST', body: JSON.stringify({ ...input, topics }) });
      setExportUnlocked(false); setPlan(data); setNewForm(null); setWeekIndex(0); setDirty(false); setRefresh(value => value + 1);
      const choice = libraryChoice;
      const selectedClass = options.classes.find(item => item.id === input.classId);
      const selectedSubject = options.subjects.find(item => item.id === input.subjectId);
      const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const correctStarterClass = choice?.level.slug === 'basic-1' && ['basic1','primary1'].includes(normalize(selectedClass?.name || ''));
      if (choice?.starter && choice.week <= data.weekCount && correctStarterClass && normalize(selectedSubject?.name || '') === normalize(choice.subject.name)) {
        setPlan({ ...data, weeks: data.weeks.map(week => week.week === choice.week ? { ...week, ...choice.starter.fields } : week) });
        setDirty(true); setWeekIndex(choice.week - 1);
        setNotice('Booklet created. Original starter added as unsaved edits. Verify curriculum codes and activities, then save your draft.');
      } else setNotice('Booklet created. Add your curriculum references, learning outcomes and lesson activities.');
      setLibraryChoice(null);
      try { sessionStorage.removeItem(LESSON_LIBRARY_KEY); } catch { /* Private browsing can disable storage. */ }
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  function changeWeek(field, value) {
    setPlan(current => ({ ...current, weeks: current.weeks.map((week, index) => index === weekIndex ? { ...week, [field]: value } : week) }));
    setDirty(true); setNotice('');
  }
  async function save(status = plan.status) {
    try {
      setBusy(true); setError('');
      const data = await request(`/lesson-plans/${plan.id}`, { method: 'PUT', body: JSON.stringify({ title: plan.title, revision: plan.revision, status, weeks: plan.weeks }) });
      setPlan(data); setDirty(false); setNotice(status === 'READY' ? 'Booklet marked ready.' : 'Booklet saved.'); setRefresh(value => value + 1);
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  async function preview() {
    if (dirty) { setError('Save your changes before opening the printable booklet.'); return; }
    try { setBusy(true); setError(''); setBooklet(await request(`/lesson-plans/${plan.id}/booklet`)); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify(booklet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `lesson-booklet-${plan.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (booklet) return <Booklet document={booklet} onClose={() => setBooklet(null)} onDownload={download} />;
  const selectedPeriod = options?.academicPeriods.find(item => item.id === newForm?.academicPeriodId);
  const classes = options?.classes.filter(item => item.academicYearId === selectedPeriod?.academicYearId && (canReview || options.assignments.some(assignment => assignment.classId === item.id && assignment.academicPeriodId === selectedPeriod?.id))) || [];
  const selectedClass = classes.find(item => item.id === newForm?.classId);
  const subjects = options?.subjects.filter(item => selectedClass?.subjectIds.includes(item.id) && (canReview || options.assignments.some(assignment => assignment.classId === selectedClass?.id && assignment.academicPeriodId === selectedPeriod?.id && (!assignment.subjectId || assignment.subjectId === item.id)))) || [];
  const currentWeek = plan?.weeks[weekIndex];

  return <div className="page lesson-plans-page">
    <PageHeader eyebrow="Teacher workspace" title="Lesson plans" description="Build a term scheme, personalize weekly lesson notes, and prepare a printable booklet." actions={canManage && <button className="primary-button" onClick={begin} disabled={busy || !options}><Icon>add</Icon>New booklet</button>} />
    {error && <div className="form-error" role="alert"><Icon>error</Icon>{error}</div>}
    {notice && <div className="lesson-notice" role="status"><Icon>check_circle</Icon>{notice}</div>}
    <p className="lesson-service-note"><a href="#/lesson-library">Browse the Ghana curriculum library ↗</a>{libraryChoice && <span> · Selected: {libraryChoice.level.name}, {libraryChoice.subject.name}. Choose New booklet to use this selection; confirm the class and term.</span>}</p>
    <p className="lesson-service-note">Your topics. Your teaching. Verify curriculum codes and review lesson content before classroom use.</p>

    {newForm && <form className="panel lesson-create" onSubmit={create}>
      <header><h2>Set up your lesson booklet</h2><button type="button" className="secondary-button" onClick={() => setNewForm(null)}>Cancel</button></header>
      {!options?.academicPeriods.length && <p role="status">No classes or active terms are available. School users should ask their administrator to configure academic and teacher assignments.</p>}
      <div className="form-grid">
        {mode === 'personal' && <label>Academic year<input required minLength={2} maxLength={40} value={newForm.academicYearName} onChange={event => setNewForm({ ...newForm, academicYearName: event.target.value })} placeholder="2026/2027" /></label>}
        <label className="form-wide">Booklet title<input required minLength={3} maxLength={150} value={newForm.title} onChange={event => setNewForm({ ...newForm, title: event.target.value })} placeholder="Class and subject lesson notes" /></label>
        <label>Academic term / semester<select required value={newForm.academicPeriodId} onChange={event => setNewForm({ ...newForm, academicPeriodId: event.target.value, classId: '', subjectId: '', ...(mode==='personal'&&{weekCount:event.target.value.startsWith('semester-')?16:12}) })}><option value="">Select term</option>{options?.academicPeriods.map(item => <option key={item.id} value={item.id}>{item.academicYear.name} · {item.name}</option>)}</select></label>
        <label>Class<select required value={newForm.classId} onChange={event => setNewForm({ ...newForm, classId: event.target.value, subjectId: '' })}><option value="">Select teaching level</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name} {item.section || ''}</option>)}</select></label>
        <label>Subject<select required value={newForm.subjectId} onChange={event => setNewForm({ ...newForm, subjectId: event.target.value })}><option value="">Select subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Teaching weeks<input type="number" min="1" max="16" required value={newForm.weekCount} onChange={event => setNewForm({ ...newForm, weekCount: Number(event.target.value) })} /></label>
        <label>Default lesson duration (minutes)<input type="number" min="20" max="180" required value={newForm.durationMinutes} onChange={event => setNewForm({ ...newForm, durationMinutes: Number(event.target.value) })} /></label>
        <label className="form-wide">Weekly topics · one line per week<textarea rows="6" maxLength={5000} value={newForm.topicText} onChange={event => setNewForm({ ...newForm, topicText: event.target.value })} placeholder="Enter your weekly topics here, or add them later in the editor." /><small>Up to {newForm.weekCount} lines. Empty weeks remain editable drafts.</small></label>
      </div>
      <footer><button className="primary-button" disabled={busy || !newForm.subjectId}><Icon>auto_stories</Icon>{busy ? 'Creating…' : 'Build editable booklet'}</button></footer>
    </form>}

    {plan && <section className="panel lesson-editor">
      {mode==='personal'&&<LessonExportPayment key={plan.id} planId={plan.id} onAccess={setExportUnlocked}/>}
      <header className="lesson-editor-header"><div><span className="eyebrow">{plan.status} · Revision {plan.revision} {dirty ? '· Unsaved changes' : '· Saved'}</span><h2>{plan.subject.name} · {plan.class.name}</h2><p>{plan.academicPeriod.academicYear.name} · {plan.academicPeriod.name} · {plan.author.firstName} {plan.author.lastName}</p></div><div className="lesson-actions">
        <button className="secondary-button" onClick={preview} disabled={busy || dirty || (mode==='personal' && !exportUnlocked)}><Icon>description</Icon>Preview booklet</button>
        {canEdit && <><button className="secondary-button" disabled={busy} onClick={() => save('DRAFT')}>Save draft</button><button className="primary-button" disabled={busy} onClick={() => save('READY')}>{busy ? 'Saving…' : 'Mark ready'}</button></>}
      </div></header>
      {!canEdit && <p className="lesson-service-note">School library view · Only the author can edit this booklet.</p>}
      <label className="lesson-title-field">Booklet title<input maxLength={150} disabled={!canEdit || busy} value={plan.title} onChange={event => { setPlan({ ...plan, title: event.target.value }); setDirty(true); }} /></label>
      <div className="lesson-edit-layout"><nav className="lesson-week-nav" aria-label="Teaching weeks">{plan.weeks.map((week, index) => <button key={week.week} className={index === weekIndex ? 'active' : ''} aria-current={index === weekIndex ? 'step' : undefined} onClick={() => setWeekIndex(index)}><strong>Week {week.week}</strong><span>{week.topic || 'Add a topic'}</span></button>)}</nav>
        <fieldset className="lesson-week-fields" disabled={!canEdit || busy}><legend>Week {currentWeek.week}</legend><div className="form-grid">
          <label>Duration (minutes)<input type="number" min="20" max="180" value={currentWeek.durationMinutes} onChange={event => changeWeek('durationMinutes', Number(event.target.value))} /></label>
          {weekFields.map(([key, label, placeholder]) => <label key={key} className={multiline.has(key) ? 'form-wide' : ''}>{label}{multiline.has(key) ? <textarea rows={key === 'mainActivity' ? 5 : 3} maxLength={2000} value={currentWeek[key]} placeholder={placeholder} onChange={event => changeWeek(key, event.target.value)} /> : <input maxLength={300} value={currentWeek[key]} placeholder={placeholder} onChange={event => changeWeek(key, event.target.value)} />}</label>)}
        </div></fieldset>
      </div>
      <footer className="lesson-editor-footer"><span>Save drafts at any stage. Ready booklets require complete outcomes, resources and lesson phases.</span>{canEdit && <button className="secondary-button" disabled={busy} onClick={() => { if (window.confirm('Archive this booklet? It will remain available in the archived library.')) save('ARCHIVED'); }}>Archive booklet</button>}</footer>
    </section>}

    <section className="panel lesson-library"><header><div><h2>Lesson library</h2><p>{library.total} saved booklet{library.total === 1 ? '' : 's'}</p></div><div className="lesson-library-filters">
      <label>Search<input type="search" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value, page: 1 })} placeholder="Title or subject" /></label>
      {canReview && <label>Library<select value={filters.scope} onChange={event => setFilters({ ...filters, scope: event.target.value, page: 1 })}><option value="mine">My booklets</option><option value="school">School library</option></select></label>}
      <label>Status<select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">Active booklets</option><option value="DRAFT">Draft</option><option value="READY">Ready</option><option value="ARCHIVED">Archived</option></select></label>
    </div></header>
    {library.items.length ? <div className="table-scroll"><table><thead><tr><th>Booklet</th><th>Class / term</th><th>Teacher</th><th>Status</th><th>Weeks</th><th>Action</th></tr></thead><tbody>{library.items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.subject.name}</small></td><td>{item.class.name} {item.class.section || ''}<small>{item.academicPeriod.name}</small></td><td>{item.author.firstName} {item.author.lastName}</td><td><span className="lesson-status">{item.status}</span></td><td>{item.weekCount}</td><td><button className="secondary-button" disabled={busy} onClick={() => open(item.id)}>Open</button></td></tr>)}</tbody></table></div> : <div className="data-state"><Icon>auto_stories</Icon><strong>No booklets found</strong><p>{filters.status === 'ARCHIVED' ? 'Archived booklets will appear here.' : 'Create a term booklet to organize your lesson notes.'}</p></div>}
    {library.pages > 1 && <footer className="lesson-pagination"><button className="secondary-button" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {library.page} of {library.pages}</span><button className="secondary-button" disabled={filters.page >= library.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></footer>}
    </section>
  </div>;
}
