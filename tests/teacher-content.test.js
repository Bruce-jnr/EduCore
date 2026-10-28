import {GHANA_LEVELS} from '../shared/ghana-curriculum.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TEACHER_CONTENT_PACKS,findContentPack} from '../server/modules/teachers/teacher-content.js';
import {createPersonalLessonService} from '../server/modules/teachers/personal-lesson.service.js';
import {personalCreateBody} from '../server/modules/teachers/teacher.validation.js';
import {lessonWeekSchema} from '../server/modules/lesson-plans/lesson-plan.validation.js';
import {incompleteWeeks} from '../server/modules/lesson-plans/lesson-plan.template.js';
const teacher={id:'teacher',firstName:'Ama',lastName:'Mensah'};
const input={title:'My number lessons',classId:'basic-7',subjectId:'mathematics',academicPeriodId:'term-1',academicYearName:'2026/2027',weekCount:12,durationMinutes:45,topics:[],contentPackId:'jhs1-maths-number-v1'};
function fixture({paid=false,auditError=false}={}){
 let plan=null;const events=[];
 const tx={personalLessonPlan:{create:async({data})=>{plan={id:'plan',revision:1,status:'DRAFT',...data};return plan;},findFirst:async({where})=>plan&&where.id===plan.id&&where.teacherId===plan.teacherId?plan:null,updateMany:async({where,data})=>{if(where.teacherId!==plan.teacherId||where.revision!==plan.revision)return {count:0};plan={...plan,...data,revision:plan.revision+1};return {count:1};}},teacherActivity:{create:async({data})=>{if(auditError)throw Error('audit unavailable');events.push(data);}},teacherLessonPurchase:{findUnique:async()=>paid?{teacherId:'teacher',planId:'plan',status:'PAID'}:null}};
 const db={...tx,$transaction:async fn=>{const before=structuredClone(plan);try{return await fn(tx);}catch(error){plan=before;throw error;}}};return {service:createPersonalLessonService(db),getPlan:()=>plan,events};
}
test('published Number pack contains twelve distinct complete schema-valid lessons',()=>{const pack=findContentPack(input.contentPackId);assert.equal(pack.weeks.length,12);assert.equal(new Set(pack.weeks.map(w=>w.topic)).size,12);assert.deepEqual(incompleteWeeks(pack.weeks),[]);for(const [index,week] of pack.weeks.entries()){assert.equal(week.week,index+1);assert.ok(lessonWeekSchema.safeParse(week).success);assert.equal(week.reflection,'');}assert.match(pack.notice,/not an official term schedule/i);assert.equal(new URL(pack.sourceUrl).hostname,'nacca.gov.gh');});
test('pack selection is validated and does not accept caller-provided content or ownership',()=>{assert.ok(personalCreateBody.safeParse(input).success);for(const extra of [{weeks:[]},{teacherId:'other'},{templateVersion:'forged'}])assert.equal(personalCreateBody.safeParse({...input,...extra}).success,false);});
test('teacher options include preview and explicit coverage without publishing full pack as default for all subjects',()=>{const options=fixture().service.options();assert.equal(options.contentPacks.length,98);const pack=options.contentPacks.find(p=>p.id===input.contentPackId);assert.equal(pack.classId,'basic-7');assert.equal(pack.subjectId,'mathematics');assert.equal(pack.topics.length,12);assert.ok(pack.sample.assessment);assert.equal(pack.weeks,undefined);assert.ok(options.academicPeriods.every(p=>p.id.startsWith('term-')));});
test('server copies pack content into an owned draft, preserving duration and provenance',async()=>{const f=fixture();const result=await f.service.create(teacher,input);assert.equal(result.author.id,teacher.id);assert.equal(result.status,'DRAFT');assert.equal(result.weeks[0].durationMinutes,45);assert.equal(result.templateVersion,findContentPack(input.contentPackId).version);assert.equal(result.contentPack.id,input.contentPackId);assert.equal(f.events[0].action,'CREATE_LESSON');result.weeks[0].topic='Teacher customized';assert.notEqual(TEACHER_CONTENT_PACKS[0].weeks[0].topic,'Teacher customized');});
for(const change of [{contentPackId:'unknown'},{classId:'basic-8'},{subjectId:'science'},{weekCount:1},{topics:['Override the pack']}])test(`invalid or mismatched pack fails before writing: ${JSON.stringify(change)}`,async()=>{const f=fixture();await assert.rejects(f.service.create(teacher,{...input,...change}),{code:'INVALID_CONTENT_PACK'});assert.equal(f.getPlan(),null);});
test('paid gate remains in force for populated lessons; editing needs no payment',async()=>{const f=fixture();const plan=await f.service.create(teacher,input);assert.ok((await f.service.get(teacher,plan.id)).weeks[0].mainActivity);await assert.rejects(f.service.booklet(teacher,plan.id),{code:'LESSON_EXPORT_PAYMENT_REQUIRED'});const edited=await f.service.update(teacher,plan.id,{title:plan.title,revision:1,status:'DRAFT',weeks:plan.weeks.map((w,i)=>i===0?{...w,resources:'Teacher-selected local resources'}:w)});assert.equal(edited.weeks[0].resources,'Teacher-selected local resources');await assert.rejects(f.service.get({id:'other'},plan.id),{statusCode:404});});
test('paid export includes populated scheme, teacher identity and curriculum provenance',async()=>{const f=fixture({paid:true});const plan=await f.service.create(teacher,input);const document=await f.service.booklet(teacher,plan.id);assert.equal(document.teacher,'Ama Mensah');assert.equal(document.scheme.length,12);assert.equal(document.weeks.length,12);assert.match(document.notice,/nacca.gov.gh/);assert.match(document.weeks[0].assessment,/4,000,000,000/);});
test('pack creation audit failure rolls back its saved snapshot',async()=>{const f=fixture({auditError:true});await assert.rejects(f.service.create(teacher,input),/audit unavailable/);assert.equal(f.getPlan(),null);});

test('every available class has a distinct complete content pack with correct export price',()=>{
 const options=fixture().service.options();
 assert.equal(new Set(TEACHER_CONTENT_PACKS.map(pack=>pack.id)).size,TEACHER_CONTENT_PACKS.length);
 assert.equal(new Set(TEACHER_CONTENT_PACKS.map(pack=>pack.version)).size,TEACHER_CONTENT_PACKS.length);
 for(const level of options.classes){
  const packs=options.contentPacks.filter(pack=>pack.classId===level.id);assert.ok(packs.length>0,level.name);
  for(const pack of packs){assert.equal(pack.exportPrice,level.id.startsWith('kg-')?5:10);assert.equal(pack.currency,'GHS');assert.equal(pack.topics.length,12);assert.ok(pack.sample.mainActivity);assert.equal(new URL(pack.sourceUrl).hostname,'nacca.gov.gh');assert.match(pack.notice,/not an official term schedule/i);}
 }
 assert.equal(TEACHER_CONTENT_PACKS.reduce((sum,pack)=>sum+pack.weeks.length,0),1176);
 for(const pack of TEACHER_CONTENT_PACKS){assert.equal(new Set(pack.weeks.map(week=>week.topic)).size,12);assert.deepEqual(incompleteWeeks(pack.weeks),[]);for(const [index,week] of pack.weeks.entries()){assert.equal(week.week,index+1);assert.ok(lessonWeekSchema.safeParse(week).success,`${pack.id}: week ${week.week}`);assert.equal(week.reflection,'');}}
});
for(const pack of TEACHER_CONTENT_PACKS)test(`creates editable, payment-gated content for ${pack.classId}/${pack.subjectId}`,async()=>{
 const f=fixture();const created=await f.service.create(teacher,{...input,contentPackId:pack.id,classId:pack.classId,subjectId:pack.subjectId,durationMinutes:pack.weeks[0].durationMinutes});
 assert.equal(created.class.id,pack.classId);assert.equal(created.subject.id,pack.subjectId);assert.equal(created.weeks.length,12);assert.equal(created.weeks[11].topic,pack.weeks[11].topic);assert.equal(created.contentPack.exportPrice,pack.classId.startsWith('kg-')?5:10);
 await assert.rejects(f.service.booklet(teacher,created.id),{code:'LESSON_EXPORT_PAYMENT_REQUIRED'});
 const updated=await f.service.update(teacher,created.id,{title:created.title,revision:1,status:'DRAFT',weeks:created.weeks.map((week,index)=>index===0?{...week,resources:'Classroom resources selected by teacher'}:week)});
 assert.equal(updated.weeks[0].resources,'Classroom resources selected by teacher');assert.equal(pack.weeks[0].resources==='Classroom resources selected by teacher',false);
});
test('unverified curriculum codes remain blank in the new packs',()=>{
 for(const pack of TEACHER_CONTENT_PACKS.filter(p=>p.id!==input.contentPackId))for(const week of pack.weeks){assert.equal(week.contentStandard,'');assert.equal(week.indicator,'');}
});

test('every listed non-mathematics class/subject has a populated pack without duplicate coverage',()=>{
 const covered=[];
 for(const level of GHANA_LEVELS.filter(item=>item.slug.startsWith('basic-')))for(const subject of level.subjects.filter(item=>item.slug!=='mathematics')){
  const packs=TEACHER_CONTENT_PACKS.filter(pack=>pack.classId===level.slug&&pack.subjectId===subject.slug);assert.equal(packs.length,1,`${level.name}: ${subject.name}`);covered.push(packs[0]);
  assert.equal(packs[0].weeks.length,12);assert.ok(packs[0].weeks.every(week=>week.mainActivity.length>100&&week.assessment.includes('Teacher check:')));assert.match(packs[0].notice,/teacher verification/);assert.match(packs[0].notice,/share unit themes/);
 }
 assert.equal(covered.length,87);
});
test('class variants provide distinct practice and assessment expectations',()=>{
 for(const group of [[1,2,3],[4,5,6],[7,8,9]]){
  const packs=group.map(n=>TEACHER_CONTENT_PACKS.find(pack=>pack.classId===`basic-${n}`&&pack.subjectId==='english-language'));
  assert.equal(new Set(packs.map(pack=>pack.weeks[0].mainActivity)).size,3);assert.equal(new Set(packs.map(pack=>pack.weeks[0].performanceIndicator)).size,3);
 }
});
test('language units disclose localization and preserve Arabic script without fabricated curriculum codes',()=>{
 const local=TEACHER_CONTENT_PACKS.find(pack=>pack.classId==='basic-7'&&pack.subjectId==='ghanaian-language');assert.match(local.notice,/not supplied translations/);
 const arabic=TEACHER_CONTENT_PACKS.find(pack=>pack.classId==='basic-7'&&pack.subjectId==='arabic');assert.ok(arabic.weeks.some(week=>/[\u0600-\u06ff]/.test(week.mainActivity)));assert.match(arabic.notice,/pronunciation/);
 for(const pack of [local,arabic])assert.ok(pack.weeks.every(week=>week.contentStandard===''&&week.indicator===''));
});
test('the expanded preview catalogue stays below the API body budget and does not contain full week arrays',()=>{
 const options=fixture().service.options();assert.ok(Buffer.byteLength(JSON.stringify(options))<1024*1024);assert.ok(options.contentPacks.every(pack=>!('weeks' in pack)));
});
test('existing Mathematics version and lesson checks remain unchanged',()=>{
 const pack=findContentPack(input.contentPackId);assert.equal(pack.version,'edupal-content:jhs1-maths-number-v1');assert.equal(pack.weeks[0].topic,'Large numbers and place value');assert.match(pack.weeks[0].assessment,/4,000,000,000/);
});

test('language, movement and creative practice targets fit the subject rather than a generic evidence-analysis task',()=>{
 const get=subject=>TEACHER_CONTENT_PACKS.find(pack=>pack.classId==='basic-7'&&pack.subjectId===subject).weeks[0];
 assert.match(get('arabic').mainActivity,/Supported communication/);assert.match(get('arabic').assessment,/comprehension/);assert.doesNotMatch(get('arabic').mainActivity,/separate a claim from its support/);
 assert.match(get('physical-education-and-health').mainActivity,/Controlled participation/);assert.match(get('creative-arts-and-design').mainActivity,/Explore and explain/);assert.match(get('computing').mainActivity,/Model, trace and try/);
});
