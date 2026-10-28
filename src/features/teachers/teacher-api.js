import { API_URL } from '../../services/api.js';
export const TEACHER_TOKEN_KEY = 'edupalgh_teacher_token';
export const TEACHER_USER_KEY = 'edupalgh_teacher_user';
export async function teacherApi(path,options={}) {
  const token = localStorage.getItem(TEACHER_TOKEN_KEY);
  const response = await fetch(`${API_URL}/teacher${path}`,{...options,headers:{'Content-Type':'application/json',...(token && {Authorization:`Bearer ${token}`}),...options.headers}});
  const payload = await response.json().catch(()=>({message:'The server returned an invalid response.'}));
  if(!response.ok) { if(response.status===401 && token) window.dispatchEvent(new Event('edupalgh:teacher-unauthorized')); throw new Error(payload.message || 'Teacher request failed.'); }
  return payload.data;
}
