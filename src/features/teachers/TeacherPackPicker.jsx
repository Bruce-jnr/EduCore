import {useState} from 'react';

export function TeacherPackPicker({packs,classes,subjects,value,onChange}){
 const [classId,setClassId]=useState(''),[subjectId,setSubjectId]=useState('');
 const classPacks=packs.filter(pack=>!classId||pack.classId===classId);
 const subjectIds=new Set(classPacks.map(pack=>pack.subjectId));
 const visible=classPacks.filter(pack=>!subjectId||pack.subjectId===subjectId).sort((a,b)=>Number(a.subjectId==='mathematics')-Number(b.subjectId==='mathematics')||a.title.localeCompare(b.title));
 function filterClass(next){setClassId(next);setSubjectId('');if(value)onChange('');}
 function filterSubject(next){setSubjectId(next);if(value)onChange('');}
 return <><div className="lesson-pack-filters"><label>Browse class<select aria-label="Pack class" value={classId} onChange={event=>filterClass(event.target.value)}><option value="">All classes</option>{classes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Browse subject<select aria-label="Pack subject" value={subjectId} onChange={event=>filterSubject(event.target.value)}><option value="">All subjects</option>{subjects.filter(item=>subjectIds.has(item.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><p role="status">{visible.length} pack{visible.length===1?'':'s'} available for this selection.</p><label>Start with<select aria-label="Lesson pack" value={value||''} onChange={event=>onChange(event.target.value)}><option value="">My own topics / blank template</option>{classes.filter(item=>visible.some(pack=>pack.classId===item.id)).map(item=><optgroup key={item.id} label={item.name}>{visible.filter(pack=>pack.classId===item.id).map(pack=><option key={pack.id} value={pack.id}>{pack.title} · {pack.weekCount} weeks</option>)}</optgroup>)}</select></label></>;
}
