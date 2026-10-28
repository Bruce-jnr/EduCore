import { useEffect, useState } from 'react';
import { GoogleAuthButton } from '../auth/GoogleAuthButton.jsx';
import { LessonPlansPage } from '../lesson-plans/LessonPlansPage.jsx';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { teacherApi, TEACHER_TOKEN_KEY, TEACHER_USER_KEY } from './teacher-api.js';
import './teacher-workspace.css';
import '../auth/google-auth.css';

function cachedTeacher() { try { return localStorage.getItem(TEACHER_TOKEN_KEY) ? JSON.parse(localStorage.getItem(TEACHER_USER_KEY)||'null') : null; } catch { return null; } }
export function TeacherPortal({ route }) {
  const [teacher,setTeacher]=useState(cachedTeacher);
  const [loading,setLoading]=useState(Boolean(localStorage.getItem(TEACHER_TOKEN_KEY)));
  const [form,setForm]=useState({firstName:'',lastName:'',email:'',password:''});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const signup=route==='/teacher/signup';
  function logout() { localStorage.removeItem(TEACHER_TOKEN_KEY); localStorage.removeItem(TEACHER_USER_KEY); setTeacher(null); setLoading(false); }
  useEffect(()=>{
    const expired=()=>logout(); window.addEventListener('edupalgh:teacher-unauthorized',expired);
    let active=true;
    if(localStorage.getItem(TEACHER_TOKEN_KEY)) teacherApi('/auth/me').then(data=>{if(active){setTeacher(data);localStorage.setItem(TEACHER_USER_KEY,JSON.stringify(data));}}).catch(()=>{if(active)logout();}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;window.removeEventListener('edupalgh:teacher-unauthorized',expired);};
  },[]);
  function establish(data) { localStorage.setItem(TEACHER_TOKEN_KEY,data.token); localStorage.setItem(TEACHER_USER_KEY,JSON.stringify(data.user)); setTeacher(data.user); window.location.assign(new URLSearchParams(window.location.search).get('payment_kind')==='lesson'?'#/payment-return':'#/teacher/lesson-plans'); }
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');
    try { establish(await teacherApi(`/auth/${signup?'signup':'login'}`,{method:'POST',body:JSON.stringify(signup?form:{email:form.email,password:form.password})})); }
    catch(problem){setError(problem.message);}finally{setBusy(false);}
  }
  if(loading)return <main className="teacher-loading" role="status">Loading your personal lesson workspace…</main>;
  if(teacher)return <div className="teacher-workspace"><header className="teacher-toolbar"><a href="#/lesson-library" className="teacher-wordmark">EduPalGh <span>Teacher workspace</span></a><div><span>{teacher.firstName} {teacher.lastName}</span><a href="#/lesson-library">Curriculum library</a><a href="#/lesson-pricing">Export pricing</a><ThemeToggle/><button className="secondary-button" onClick={logout}>Teacher sign out</button></div></header><p className="teacher-personal-note">Your personal lesson plans · No school affiliation required</p><LessonPlansPage mode="personal" teacherUser={teacher}/></div>;
  return <main className="teacher-auth-page"><section className="teacher-auth-intro"><a href="#/lesson-library">← Lesson library</a><span className="teacher-kicker">EduPalGh for every teacher</span><h1>Your lesson plans.<br/>Your own workspace.</h1><p>Plan your lessons, prepare weekly notes and print term booklets. You don’t need a school account or an administrator’s invitation.</p><ul><li>Private lesson library</li><li>Editable weekly templates</li><li>Print or save as PDF</li></ul><a className="teacher-school-link" href="#/login">Looking for your school portal? School sign in ↗</a></section><section className="teacher-auth-form"><form onSubmit={submit} className="teacher-auth-card"><a className="teacher-wordmark" href="#/">EduPalGh</a><div><span className="teacher-kicker">Independent teacher account</span><h2>{signup?'Create your teacher account':'Teacher sign in'}</h2><p>{signup?'Start your personal lesson library. No school details needed.':'Welcome back to your personal lesson workspace.'}</p></div>{error&&<p className="form-error" role="alert">{error}</p>}
    <GoogleAuthButton intent={signup?'signup':'signin'} authPath="/auth/google" request={teacherApi} onCredential={async credentials=>establish(await teacherApi(`/auth/google/${signup?'signup':'signin'}`,{method:'POST',body:JSON.stringify(credentials)}))}/>
    <div className="auth-divider">or continue with email</div>
    {signup&&<div className="teacher-name-fields"><label>First name<input required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label><label>Last name<input required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label></div>}
    <label>Email address<input type="email" required maxLength={191} autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required minLength={signup?12:1} maxLength={signup?72:128} autoComplete={signup?'new-password':'current-password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>{signup&&<small>Use at least 12 characters. Keep your password in a safe place.</small>}</label>
    <button className="primary-button" disabled={busy}>{busy?'Please wait…':signup?'Create teacher account':'Sign in to lesson plans'}</button>
    <p className="teacher-auth-switch">{signup?'Already have a teacher account?':'New to lesson planning?'} <a href={signup?'#/teacher/login':'#/teacher/signup'}>{signup?'Sign in':'Create a teacher account'}</a></p>
  </form></section></main>;
}
