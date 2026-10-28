import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createTeacherAuthService } from '../server/modules/teachers/teacher-auth.service.js';
import { createTeacherSessions, createTeacherAuthenticate } from '../server/modules/teachers/teacher-session.js';
import { createPersonalLessonService } from '../server/modules/teachers/personal-lesson.service.js';
import { teacherSignupBody, teacherLoginBody, personalCreateBody } from '../server/modules/teachers/teacher.validation.js';
import { buildLessonWeeks } from '../server/modules/lesson-plans/lesson-plan.template.js';
import { createGoogleIdentity } from '../server/modules/auth/google-identity.js';

const secret = 'test-only-secret-over-thirty-two-characters';
test('personal teacher sessions cannot be exchanged with school sessions', () => {
  const sessions = createTeacherSessions(secret,'15m');
  const personal = sessions.sign({id:'teacher1'});
  const school = jwt.sign({tenantId:'school1'},secret,{subject:'school-user1'});
  assert.equal(sessions.verify(personal),'teacher1');
  assert.throws(()=>sessions.verify(school),{code:'INVALID_TEACHER_SESSION'});
  assert.throws(()=>jwt.verify(personal,secret));
  assert.throws(()=>sessions.verify(jwt.sign({accountType:'teacher'},secret,{subject:'school-user1',audience:'edupalgh-personal-teacher'})),{statusCode:401});
});
test('teacher sessions from another installation secret fail', () => {
  const original=createTeacherSessions(secret,'15m');
  assert.throws(()=>createTeacherSessions('different-secret','15m').verify(original.sign({id:'teacher1'})),{statusCode:401});
});
test('teacher middleware rejects disabled accounts and missing tokens', async () => {
  const sessions=createTeacherSessions(secret,'15m');
  const middleware=createTeacherAuthenticate({teacherAccount:{findUnique:async({where})=>{assert.equal(where.id,'teacher1');return {id:'teacher1',isActive:false};}}},sessions);
  let result;
  await middleware({headers:{}},{},error=>{result=error;});assert.equal(result.code,'TEACHER_AUTH_REQUIRED');
  await middleware({headers:{authorization:`Bearer ${sessions.sign({id:'teacher1'})}`}},{},error=>{result=error;});assert.equal(result.code,'INVALID_TEACHER_SESSION');
});
test('teacher registration rejects injected school roles/tenant IDs and bcrypt-truncated passwords', () => {
  const input={firstName:'Ama',lastName:'Mensah',email:'ama@example.com',password:'a-long-test-password'};
  assert.equal(teacherSignupBody.safeParse(input).success,true);
  assert.equal(teacherSignupBody.safeParse({...input,tenantId:'school1'}).success,false);
  assert.equal(teacherSignupBody.safeParse({...input,roles:['School Administrator']}).success,false);
  assert.equal(teacherSignupBody.safeParse({...input,password:'😀'.repeat(30)}).success,false);
  assert.equal(teacherLoginBody.safeParse({email:input.email,password:'a'.repeat(73)}).success,false);
  assert.equal(teacherSignupBody.safeParse({...input,password:'short'}).success,false);
});
function authFixture({existing=false,active=true,duplicate=false,auditError=false,googleOnly=false}={}) {
  const calls=[];
  const account={id:'teacher1',firstName:'Ama',lastName:'Mensah',email:'ama@example.com',isActive:active,passwordHash:googleOnly?null:'hash'};
  const tx={teacherAccount:{findUnique:async({where})=>{calls.push(['lookup',where]);return existing?account:null;},create:async({data})=>{calls.push(['create',data]);if(duplicate)throw Object.assign(new Error('unique'),{code:'P2002'});return account;},update:async()=>{calls.push(['login']);}},teacherActivity:{create:async({data})=>{calls.push(['audit',data]);if(auditError)throw new Error('audit failure');}}};
  const db={...tx,$transaction:async fn=>{calls.push(['begin']);try{const result=await fn(tx);calls.push(['commit']);return result;}catch(error){calls.push(['rollback']);throw error;}}};
  const service=createTeacherAuthService({db,hash:async(password,cost)=>{assert.equal(cost,12);assert.ok(password);return 'hash';},compare:async()=>true,signSession:()=>{calls.push(['session']);return 'token';},identity:{verify:async(_credential,_challenge,intent)=>{calls.push(['identity',intent]);return {subject:'google1',firstName:'Ama',lastName:'Mensah',email:'ama@example.com'};}}});
  return {service,calls};
}
test('email signup creates only a personal teacher identity and records activity atomically', async()=>{
  const {service,calls}=authFixture();
  const result=await service.register({firstName:'Ama',lastName:'Mensah',email:'ama@example.com',password:'long-password'});
  assert.equal(result.user.accountType,'teacher');
  assert.equal(result.user.tenant,undefined);assert.equal(result.user.passwordHash,undefined);
  assert.deepEqual(result.user.permissions,['lesson-plans.view','lesson-plans.manage']);
  assert.equal(calls.find(([name])=>name==='create')[1].tenantId,undefined);
  assert.equal(calls.find(([name])=>name==='create')[1].emailVerifiedAt,undefined);
  assert.ok(calls.findIndex(([name])=>name==='commit')<calls.findIndex(([name])=>name==='session'));
});
test('duplicate teacher signup reports a conflict without issuing a session',async()=>{
  const {service,calls}=authFixture({duplicate:true});
  await assert.rejects(service.register({password:'long-password'}),{code:'TEACHER_ACCOUNT_EXISTS'});
  assert.equal(calls.at(-1)[0],'rollback');
});
test('audit failure aborts teacher signup',async()=>{
  const {service,calls}=authFixture({auditError:true});
  await assert.rejects(service.register({password:'long-password'}),/audit failure/);
  assert.equal(calls.at(-1)[0],'rollback');
});
test('password sign-in accepts personal accounts without school lookups',async()=>{
  const {service}=authFixture({existing:true});
  assert.equal((await service.login({email:'ama@example.com',password:'password'})).user.id,'teacher1');
});
for(const [name,options] of [['missing',{}],['disabled',{existing:true,active:false}],['Google-only',{existing:true,googleOnly:true}]])test(`password sign-in rejects ${name} teacher`,async()=>{
  await assert.rejects(authFixture(options).service.login({email:'ama@example.com',password:'password'}),{code:'INVALID_TEACHER_CREDENTIALS'});
});
test('Google teacher signup uses its own intent and no school provisioning',async()=>{
  const {service,calls}=authFixture();
  await service.google('signup',{credential:'credential',challenge:'challenge'});
  assert.equal(calls.find(([name])=>name==='identity')[1],'teacher-signup');
  const data=calls.find(([name])=>name==='create')[1];
  assert.equal(data.googleSubject,'google1');assert.equal(data.passwordHash,undefined);
});
test('Google teacher login never searches by email or auto-links password accounts',async()=>{
  const {service,calls}=authFixture();
  await assert.rejects(service.google('signin',{credential:'credential',challenge:'challenge'}),{code:'TEACHER_ACCOUNT_UNAVAILABLE'});
  assert.deepEqual(calls.find(([name])=>name==='lookup')[1],{googleSubject:'google1'});
});
test('school Google challenges cannot be used for teacher intents',async()=>{
  const identity=createGoogleIdentity({clientId:'client',secret,verifyIdToken:async()=>{throw new Error('should not reach provider');}});
  await assert.rejects(identity.verify('credential',identity.challenge('signup'),'teacher-signup'),{code:'INVALID_GOOGLE_IDENTITY'});
});

function planFixture({missing=false,conflict=false,auditError=false,paid=false}={}) {
  const calls=[];
  let plan={id:'plan1',teacherId:'teacher1',title:'Personal lessons',classKey:'basic-1',className:'Basic 1',subjectKey:'mathematics',subjectName:'Mathematics',termKey:'term-1',termName:'Term 1',academicYearName:'2026/2027',weekCount:1,weeks:buildLessonWeeks(['Counting'],1),revision:1,status:'DRAFT'};
  const personalLessonPlan={findFirst:async({where})=>{calls.push(['read',where]);return !missing&&where.teacherId===plan.teacherId?plan:null;},findMany:async({where})=>{calls.push(['list',where]);return where.teacherId===plan.teacherId?[plan]:[];},count:async()=>1,create:async({data})=>{calls.push(['create',data]);plan={...plan,...data};return plan;},updateMany:async({where,data})=>{calls.push(['update',where]);if(conflict)return {count:0};plan={...plan,...data,revision:2};return {count:1};}};
  const tx={personalLessonPlan,teacherLessonPurchase:{findUnique:async({where})=>paid&&where.planId==='plan1'?{teacherId:'teacher1',planId:'plan1',status:'PAID'}:null},teacherActivity:{create:async({data})=>{calls.push(['audit',data]);if(auditError)throw new Error('audit failure');}}};
  const db={...tx,$transaction:async fn=>{try{return await fn(tx);}catch(error){calls.push(['rollback']);throw error;}}};
  return {service:createPersonalLessonService(db),calls,plan};
}
const teacher={id:'teacher1',firstName:'Ama',lastName:'Mensah'};
const input={title:'My lessons',classId:'basic-1',subjectId:'mathematics',academicPeriodId:'term-1',academicYearName:'2026/2027',weekCount:1,durationMinutes:60,topics:['Counting']};
test('personal booklets can be created without tenant, staff or school academic records',async()=>{
  const {service,calls}=planFixture();
  const result=await service.create(teacher,input);
  assert.equal(result.author.id,teacher.id);assert.equal(result.class.name,'Basic 1');
  assert.equal(result.academicPeriod.academicYear.name,'2026/2027');
  assert.equal(calls.find(([name])=>name==='create')[1].tenantId,undefined);
  assert.equal(calls.find(([name])=>name==='audit')[1].teacherId,teacher.id);
});
test('personal create validation rejects caller-supplied ownership',()=>{
  assert.equal(personalCreateBody.safeParse(input).success,true);
  assert.equal(personalCreateBody.safeParse({...input,teacherId:'teacher2'}).success,false);
  assert.equal(personalCreateBody.safeParse({...input,tenantId:'school1'}).success,false);
});
test('personal library cannot request school scope and always filters by owner',async()=>{
  const {service,calls}=planFixture();
  await assert.rejects(service.list(teacher,{scope:'school'}),{code:'PERSONAL_LIBRARY_ONLY'});
  await service.list(teacher,{scope:'mine',page:1,limit:20,search:''});
  assert.equal(calls.find(([name])=>name==='list')[1].teacherId,'teacher1');
  await assert.rejects(service.get({id:'teacher2'},'plan1'),{statusCode:404});
});
test('cross-teacher edits and exports are rejected before any update',async()=>{
  const {service,calls}=planFixture();
  await assert.rejects(service.update({id:'teacher2'},'plan1',{}),{statusCode:404});
  await assert.rejects(service.booklet({id:'teacher2'},'plan1'),{statusCode:404});
  assert.ok(!calls.some(([name])=>name==='update'));
});
test('stale revisions cannot overwrite a personal lesson',async()=>{
  const {service,plan,calls}=planFixture({conflict:true});
  await assert.rejects(service.update(teacher,'plan1',{title:plan.title,weeks:plan.weeks,status:'DRAFT',revision:1}),{code:'LESSON_REVISION_CONFLICT'});
  assert.deepEqual(calls.find(([name])=>name==='update')[1],{id:'plan1',teacherId:'teacher1',revision:1});
  assert.ok(!calls.some(([name])=>name==='audit'));
});
test('personal readiness and week-count checks remain enforced',async()=>{
  const {service,plan}=planFixture();
  await assert.rejects(service.update(teacher,'plan1',{weeks:[],status:'DRAFT'}),{code:'LESSON_WEEK_COUNT_MISMATCH'});
  await assert.rejects(service.update(teacher,'plan1',{weeks:plan.weeks,status:'READY'}),{code:'INCOMPLETE_LESSON_PLAN'});
});
test('personal lesson audit failure propagates to transaction rollback',async()=>{
  const {service,calls}=planFixture({auditError:true});
  await assert.rejects(service.create(teacher,input),/audit failure/);
  assert.equal(calls.at(-1)[0],'rollback');
});
test('paid personal export has teacher branding and no school affiliation',async()=>{
  const {service}=planFixture({paid:true});
  const booklet=await service.booklet(teacher,'plan1');
  assert.equal(booklet.teacher,'Ama Mensah');assert.equal(booklet.school.schoolCode,'PERSONAL');
  assert.equal(booklet.school.id,undefined);
});

test('unpaid personal booklet export is blocked while lesson editing remains available',async()=>{const {service}=planFixture();assert.equal((await service.get(teacher,'plan1')).id,'plan1');await assert.rejects(service.booklet(teacher,'plan1'),{code:'LESSON_EXPORT_PAYMENT_REQUIRED'});});
