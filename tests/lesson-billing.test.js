import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSON_PRICES,lessonProduct} from '../shared/lesson-pricing.js';
import {createLessonBilling} from '../server/modules/teachers/lesson-billing.service.js';
import {lessonPurchaseSchema,lessonVerifySchema} from '../server/modules/teachers/lesson-billing.validation.js';
import {createPersonalLessonService} from '../server/modules/teachers/personal-lesson.service.js';
const teacher={id:'teacher1'},operator={userId:'platform1'};
const request={planId:'plan1',idempotencyKey:'40406fe0-be4a-40af-a777-a06387927085'};
const receipt={verified:true,amount:10,paymentMethod:'MOBILE_MONEY',paymentReference:'TEST-LESSON-1'};
function fixture({paid=false,auditError=false,active=true,classKey='basic-1'}={}) {
 const plans=[{id:'plan1',teacherId:'teacher1',classKey},{id:'plan2',teacherId:'teacher1',classKey},{id:'other',teacherId:'teacher2',classKey}];
 const purchases=paid?[{id:'purchase1',teacherId:'teacher1',planId:'plan1',product:'PRIMARY_JHS',amount:10,currency:'GHS',status:'PAID',paymentMethod:'MOBILE_MONEY',paymentReference:'TEST-LESSON-1',idempotencyKey:request.idempotencyKey}]:[];
 const calls=[];
 const tx={
  $queryRaw:async(strings,...values)=>{calls.push(['lock',strings.join('?'),values]);return [{id:teacher.id}];},
  teacherAccount:{findUnique:async()=>({id:teacher.id,isActive:active})},
  personalLessonPlan:{findFirst:async({where})=>plans.find(plan=>plan.id===where.id&&plan.teacherId===where.teacherId)||null},
  teacherLessonPurchase:{
   findUnique:async({where})=>purchases.find(p=>Object.entries(where).every(([key,value])=>p[key]===value))||null,
   create:async({data})=>{const p={id:`purchase${purchases.length+1}`,status:'PENDING',...data};purchases.push(p);calls.push(['create',data]);return p;},
   update:async({where,data})=>{if(purchases.some(p=>p.id!==where.id&&p.paymentMethod===data.paymentMethod&&p.paymentReference===data.paymentReference))throw Object.assign(new Error('duplicate'),{code:'P2002'});const p=purchases.find(p=>p.id===where.id);Object.assign(p,data);calls.push(['update',data]);return p;},
  },
  teacherActivity:{create:async()=>{calls.push(['activity']);if(auditError)throw new Error('audit unavailable');}},
  auditLog:{create:async()=>{calls.push(['audit']);if(auditError)throw new Error('audit unavailable');}},
 };
 const db={...tx,$transaction:async callback=>{const before=structuredClone(purchases);try{return await callback(tx);}catch(error){purchases.splice(0,purchases.length,...before);calls.push(['rollback']);throw error;}}};
 return {service:createLessonBilling(db),db,calls,purchases};
}
test('lesson prices match the inspected reference; custom schemes remain unavailable',()=>{
 assert.equal(LESSON_PRICES.KG.amount,5);assert.equal(LESSON_PRICES.PRIMARY_JHS.amount,10);assert.equal(LESSON_PRICES.SHS.amount,30);assert.equal(LESSON_PRICES.CUSTOM.amount,20);assert.equal(LESSON_PRICES.CUSTOM.enabled,false);
 assert.equal(lessonProduct('kg-2'),'KG');assert.equal(lessonProduct('basic-9'),'PRIMARY_JHS');assert.equal(lessonProduct('shs-3'),'SHS');assert.equal(lessonProduct('unknown'),null);
});
for(const [classKey,amount] of [['kg-1',5],['basic-1',10],['shs-1',30]])test(`server quote prices ${classKey} from stored booklet context`,async()=>{
 const f=fixture({classKey});assert.equal((await f.service.quote(teacher,'plan1')).amount,amount);
});
test('another teacher cannot quote, request or export the booklet',async()=>{
 const f=fixture();
 await assert.rejects(f.service.quote({id:'teacher2'},'plan1'),{statusCode:404});
 await assert.rejects(f.service.request({id:'teacher2'},request),{statusCode:404});
 await assert.rejects(f.service.requirePaid({id:'teacher2'},'plan1'),{statusCode:404});
 assert.equal(f.purchases.length,0);
});
test('purchase request serializes on teacher row and ignores no caller price because schema forbids it',async()=>{
 const f=fixture();const purchase=await f.service.request(teacher,request);
 assert.equal(f.calls[0][0],'lock');assert.match(f.calls[0][1],/FOR UPDATE/);
 assert.equal(purchase.amount,10);assert.equal(purchase.status,'PENDING');
 const envelope=body=>({body,params:{},query:{}});
 assert.equal(lessonPurchaseSchema.safeParse(envelope(request)).success,true);
 for(const extra of [{amount:1},{product:'KG'},{teacherId:'teacher2'},{status:'PAID'}])assert.equal(lessonPurchaseSchema.safeParse(envelope({...request,...extra})).success,false);
});
test('retry requests reuse a single purchase; the key cannot be repurposed for another booklet',async()=>{
 const f=fixture();const first=await f.service.request(teacher,request);
 assert.equal((await f.service.request(teacher,request)).id,first.id);
 assert.equal((await f.service.request(teacher,{...request,idempotencyKey:'new-key'})).id,first.id);
 await assert.rejects(f.service.request(teacher,{...request,planId:'plan2'}),{code:'IDEMPOTENCY_CONFLICT'});
 assert.equal(f.purchases.length,1);
});
test('one paid booklet does not unlock another booklet in the same class',async()=>{
 const f=fixture({paid:true});await f.service.requirePaid(teacher,'plan1');
 await assert.rejects(f.service.requirePaid(teacher,'plan2'),{statusCode:402,code:'LESSON_EXPORT_PAYMENT_REQUIRED'});
 assert.equal((await f.service.quote(teacher,'plan2')).paid,false);
});
test('pending requests do not unlock exports and unverified/partial receipts fail',async()=>{
 const f=fixture();const p=await f.service.request(teacher,request);
 await assert.rejects(f.service.requirePaid(teacher,'plan1'),{statusCode:402});
 await assert.rejects(f.service.verify(operator,p.id,{...receipt,verified:false}),{code:'PAYMENT_VERIFICATION_REQUIRED'});
 await assert.rejects(f.service.verify(operator,p.id,{...receipt,amount:1}),{code:'LESSON_AMOUNT_MISMATCH'});
 assert.equal(f.purchases[0].status,'PENDING');
});
test('verified payment unlocks the booklet with operator audit; a matching retry is idempotent',async()=>{
 const f=fixture();const p=await f.service.request(teacher,request);
 const paid=await f.service.verify(operator,p.id,receipt);assert.equal(paid.status,'PAID');assert.equal(paid.verifiedById,operator.userId);
 await f.service.requirePaid(teacher,'plan1');const audits=f.calls.filter(([name])=>name==='audit').length;
 await f.service.verify(operator,p.id,receipt);assert.equal(f.calls.filter(([name])=>name==='audit').length,audits);
 await assert.rejects(f.service.verify(operator,p.id,{...receipt,paymentReference:'OTHER-REFERENCE'}),{code:'LESSON_PAYMENT_ALREADY_VERIFIED'});
});
test('one receipt cannot verify two lesson purchases',async()=>{
 const f=fixture();const one=await f.service.request(teacher,request);const two=await f.service.request(teacher,{planId:'plan2',idempotencyKey:'other-key'});
 await f.service.verify(operator,one.id,receipt);
 await assert.rejects(f.service.verify(operator,two.id,receipt),{code:'DUPLICATE_LESSON_PAYMENT'});
 assert.equal(f.purchases.find(p=>p.id===two.id).status,'PENDING');
});
test('audit failure rolls back purchase creation or payment verification',async()=>{
 const f=fixture({auditError:true});await assert.rejects(f.service.request(teacher,request),/audit unavailable/);assert.equal(f.purchases.length,0);
 const g=fixture({paid:true,auditError:true});g.purchases[0].status='PENDING';
 await assert.rejects(g.service.verify(operator,'purchase1',receipt),/audit unavailable/);assert.equal(g.purchases[0].status,'PENDING');
});
test('disabled teacher accounts cannot receive a purchase or payment approval',async()=>{
 const f=fixture({active:false});await assert.rejects(f.service.request(teacher,request),{code:'TEACHER_ACCOUNT_UNAVAILABLE'});
});
test('verification inputs require explicit confirmation and the approved receipt fields',()=>{
 const env=body=>({body,params:{id:'purchase1'},query:{}});
 assert.equal(lessonVerifySchema.safeParse(env(receipt)).success,true);
 assert.equal(lessonVerifySchema.safeParse(env({...receipt,verified:false})).success,false);
 assert.equal(lessonVerifySchema.safeParse(env({...receipt,status:'PAID'})).success,false);
});
test('new personal booklets offer KG, primary and JHS without SHS',()=>{
 const options=createPersonalLessonService({}).options();
 assert.equal(options.classes.some(c=>c.id.startsWith('shs-')),false);
 for(const n of [7,8,9]){const level=options.classes.find(c=>c.id===`basic-${n}`);assert.match(level.name,/JHS/);assert.deepEqual(level.periodIds,['term-1','term-2','term-3']);}
});

test('new SHS booklets reject term IDs before any write',async()=>{
 const service=createPersonalLessonService({});
 await assert.rejects(service.create({id:'teacher1'},{classId:'shs-1',subjectId:'mathematics',academicPeriodId:'term-1'}),{code:'INVALID_PERSONAL_CONTEXT'});
});
