import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { CURRICULUM_SOURCES, GHANA_LEVELS, LESSON_FIELDS, LESSON_LIBRARY_KEY, parseLibraryRoute, getStarter, librarySelection } from './ghana-curriculum.js';
import './lesson-library.css';

function BookIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 6v15M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Z" /></svg>;
}
function Card({ href, children, description }) {
  return <a className="curriculum-card" href={href}><span><BookIcon />{children}</span>{description && <small>{description}</small>}</a>;
}
const base = '#/lesson-library';
export function LessonLibraryPage({ route }) {
  const { user } = useAuth();
  const selection = parseLibraryRoute(route === '/lesson-plans' ? '/lesson-library' : route);
  const { level, period, subject, week } = selection || {};
  const periodName = period === 'scheme-of-learning' ? 'Yearly scheme of learning' : period?.replace('term-', 'Term ');
  const title = !selection ? 'Lesson page not found' : !level ? 'Lesson Plans for Ghana Teachers' : [level.name, subject?.name, periodName, week ? `Week ${week}` : '', period === 'scheme-of-learning' ? '' : 'Lesson Plans'].filter(Boolean).join(' ');
  useEffect(() => { document.title = `${title} | EduPalGh`; return () => { document.title = 'EduPalGh'; }; }, [title]);
  const starter = getStarter(selection);
  const source = level ? CURRICULUM_SOURCES[level.source] : null;
  function useTemplate() {
    if (subject && period !== 'scheme-of-learning') {
      try { sessionStorage.setItem(LESSON_LIBRARY_KEY, JSON.stringify(librarySelection({ ...selection, week: week || 1 }))); }
      catch { window.alert('Your browser could not keep this selection. You can still create a booklet in your workspace.'); }
    }
    if (!subject || period === 'scheme-of-learning') { try { sessionStorage.removeItem(LESSON_LIBRARY_KEY); } catch { /* Storage may be disabled. */ } }
    window.location.assign('#/teacher/lesson-plans');
  }
  const crumbs = [{ name: 'Home', href: '#/' }, { name: 'Lesson Plans', href: base }, ...(level ? [{ name: level.name, href: `${base}/${level.slug}` }] : []), ...(period ? [{ name: periodName, href: `${base}/${level.slug}/${period}` }] : []), ...(subject ? [{ name: subject.name, href: `${base}/${level.slug}/${period}/${subject.slug}` }] : []), ...(week ? [{ name: `Week ${week}` }] : [])];
  return <div className="curriculum-page">
    <div className="curriculum-topbar"><a href={base} aria-current="page">Lesson Plans</a><a href="#/">School tools</a><a href="https://nacca.gov.gh/" target="_blank" rel="noreferrer">NaCCA curriculum ↗</a></div>
    <header className="curriculum-nav"><a className="curriculum-brand" href="#/">EduPalGh</a><nav aria-label="Main navigation"><a className="curriculum-current" href={base}>Lesson library</a><a href="#/lesson-pricing">Lesson pricing</a><a href="#/teacher/login">Teacher sign in</a><a href={user ? '#/dashboard' : '#/login'}>School portal</a><ThemeToggle /></nav></header>
    <main className="curriculum-main" id="lesson-library-main">
      <nav className="curriculum-breadcrumb" aria-label="Breadcrumb">{crumbs.map((item, index) => <span key={item.name}>{index > 0 && <span aria-hidden="true">›</span>}{index === crumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <a href={item.href}>{item.name}</a>}</span>)}</nav>
      <h1>{title}</h1>
      {!selection ? <p>This page is not in the library. <a href={base}>Browse all classes</a>.</p> : <>
        {!level && <div className="curriculum-grid">{GHANA_LEVELS.map(item => <Card key={item.slug} href={`${base}/${item.slug}`}>{item.name}</Card>)}</div>}
        {level && !period && <div className="curriculum-grid"><Card href={`${base}/${level.slug}/scheme-of-learning`}>Yearly Scheme of Learning</Card>{[1,2,3].map(n => <Card key={n} href={`${base}/${level.slug}/term-${n}`}>Term {n}</Card>)}</div>}
        {period && !subject && <div className="curriculum-grid">{level.subjects.map(item => <Card key={item.slug} href={`${base}/${level.slug}/${period}/${item.slug}`}>{item.name}</Card>)}</div>}
        {subject && !week && period !== 'scheme-of-learning' && <>
          <p className="curriculum-context">Choose a week to prepare your notes. Week numbers are planning slots; confirm your school’s scheme before assigning topics.</p>
          <div className="curriculum-grid">{Array.from({ length: 12 }, (_, i) => { const draft = getStarter({ ...selection, week: i + 1 }); return <Card key={i} href={`${base}/${level.slug}/${period}/${subject.slug}/week-${i + 1}`} description={draft ? `Original starter · ${draft.title}` : 'Editable lesson template'}>Week {i + 1}</Card>; })}</div>
        </>}
        {subject && period === 'scheme-of-learning' && <section className="curriculum-scheme"><h2>Plan your yearly scheme</h2><p>Use the official curriculum and your school’s calendar to sequence strands and indicators across three terms.</p><div className="curriculum-grid">{[1,2,3].map(n => <Card key={n} href={`${base}/${level.slug}/term-${n}/${subject.slug}`}>Term {n}</Card>)}</div><p className="curriculum-context">No official week-by-week schedule is asserted here. Your school’s reviewed scheme determines the pacing.</p></section>}
        {week && <article className="curriculum-lesson">
          <div className="curriculum-lesson-heading"><div><span>{starter ? 'Original EduPalGh starter · Review before use' : 'Editable weekly lesson template'}</span><h2>{starter?.title || `${subject.name} · Week ${week}`}</h2></div><button className="curriculum-outline" onClick={() => window.print()}>Print template</button></div>
          <p className="curriculum-context">{starter ? 'A teaching suggestion to adapt to your learners. Add verified curriculum codes and check the topic against your term scheme.' : 'Add your topic, verified standards and teaching activities in your personal teacher workspace.'}</p>
          <dl className="curriculum-meta"><div><dt>Class</dt><dd>{level.name}</dd></div><div><dt>Subject</dt><dd>{subject.name}</dd></div><div><dt>Term</dt><dd>{periodName}</dd></div><div><dt>Week</dt><dd>{week}</dd></div></dl>
          <dl className="curriculum-fields">{LESSON_FIELDS.map(([key,label]) => <div key={key} className={['starter','mainActivity','assessment','plenary','reflection'].includes(key) ? 'curriculum-wide' : ''}><dt>{label}</dt><dd>{starter?.fields[key] || (key === 'contentStandard' || key === 'indicator' ? 'Add the verified code and description from the official curriculum.' : 'Complete in your lesson editor.')}</dd></div>)}</dl>
          <nav className="curriculum-week-links" aria-label="Other teaching weeks">{Array.from({length:12},(_,i)=><a key={i} aria-current={week===i+1?'page':undefined} href={`${base}/${level.slug}/${period}/${subject.slug}/week-${i+1}`}>Week {i+1}</a>)}</nav>
        </article>}
        <section className="curriculum-cta"><h2>Make these lesson notes your own</h2><p>Choose your teaching level and subject, edit weekly notes, and print your term booklet. No school account needed.</p><div><button className="curriculum-primary" onClick={useTemplate}>{week ? 'Use this template' : 'Create on Web'}</button><a className="curriculum-outline" href="#/teacher/signup">Create a teacher account</a></div></section>
        <aside className="curriculum-sources"><h2>{source ? 'Curriculum references' : 'Ghana curriculum library'}</h2><p>Official curriculum references, editable templates and original starter activities. Teacher review is required; this is not an approved or complete set of weekly lesson notes.</p><div>{(source ? [source] : [CURRICULUM_SOURCES.primary,CURRICULUM_SOURCES.jhs]).map(item => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a>)}{level?.source === 'primary' && <a href={CURRICULUM_SOURCES.resources.url} target="_blank" rel="noreferrer">Primary teacher resource pack ↗</a>}</div>{level?.source === 'shs' && <p>SHS resources are reference links. Independent teachers can create personal booklets without a school account; verify programme requirements before use.</p>}</aside>
      </>}
    </main><footer className="curriculum-footer">EduPalGh · Built for Ghanaian school communities</footer>
  </div>;
}
