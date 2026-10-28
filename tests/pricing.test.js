import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHOOL_PLANS,planPrice,billingPeriodEnd,schoolLimits,money } from '../shared/pricing.js';
import { assertSchoolCapacity,assertSubscription,assertPlanFeature } from '../server/modules/subscriptions/plan-policy.js';
import { createSubscriptionService } from '../server/modules/subscriptions/subscription.service.js';
import { subscriptionSchema,subscriptionPaymentSchema } from '../server/modules/platform/platform.validation.js';

test('price catalogue matches verified monthly/annual rates and capacities',()=>{
 assert.equal(planPrice('FREEMIUM','ANNUAL'),0);
 assert.equal(planPrice('STARTER','MONTHLY'),400);assert.equal(planPrice('STARTER','ANNUAL'),4000);
 assert.equal(planPrice('PROFESSIONAL','MONTHLY'),750);assert.equal(planPrice('PROFESSIONAL','ANNUAL'),7500);
 assert.deepEqual([SCHOOL_PLANS.FREEMIUM.students,SCHOOL_PLANS.FREEMIUM.staff],[50,5]);
 assert.deepEqual([SCHOOL_PLANS.STARTER.students,SCHOOL_PLANS.STARTER.staff],[500,30]);
 assert.deepEqual([SCHOOL_PLANS.PROFESSIONAL.students,SCHOOL_PLANS.PROFESSIONAL.staff],[1000,100]);
});
test('calendar billing clamps short months and leap years',()=>{
 assert.equal(billingPeriodEnd(new Date('2026-01-31T12:00:00Z'),'MONTHLY').toISOString(),'2026-02-28T12:00:00.000Z');
 assert.equal(billingPeriodEnd(new Date('2028-02-29T10:00:00Z'),'ANNUAL').toISOString(),'2029-02-28T10:00:00.000Z');
});
test('free access does not expire; paid access requires a valid period and denies overdue states',()=>{
 assert.doesNotThrow(()=>assertSubscription({subscriptionPlan:'FREEMIUM',subscriptionStatus:'ACTIVE'}));
 assert.throws(()=>assertSubscription({subscriptionPlan:'STARTER',subscriptionStatus:'ACTIVE'}),{code:'SUBSCRIPTION_PERIOD_REQUIRED'});
 for(const status of ['PAST_DUE','EXPIRED','CANCELLED'])assert.throws(()=>assertSubscription({subscriptionPlan:'PROFESSIONAL',subscriptionStatus:status,subscriptionEndsAt:new Date('2099-01-01')}),{code:'SUBSCRIPTION_EXPIRED'});
 assert.throws(()=>assertSubscription({subscriptionPlan:'STARTER',subscriptionStatus:'TRIAL',subscriptionEndsAt:new Date('2026-01-01')},new Date('2026-01-01')),{code:'SUBSCRIPTION_EXPIRED'});
});
test('features require both their plan level and the surrounding existing role checks',()=>{
 assert.throws(()=>assertPlanFeature({subscriptionPlan:'FREEMIUM'},'finance'),{code:'PLAN_UPGRADE_REQUIRED'});
 assert.doesNotThrow(()=>assertPlanFeature({subscriptionPlan:'STARTER'},'finance'));
 assert.throws(()=>assertPlanFeature({subscriptionPlan:'STARTER'},'schoolLessons'),{code:'PLAN_UPGRADE_REQUIRED'});
 assert.doesNotThrow(()=>assertPlanFeature({subscriptionPlan:'PROFESSIONAL'},'schoolLessons'));
 assert.deepEqual(schoolLimits({subscriptionPlan:'TRIAL'}),{students:1000,staff:100});
 assert.deepEqual(schoolLimits({subscriptionPlan:'ENTERPRISE',enterpriseStudentLimit:4000,enterpriseStaffLimit:250}),{students:4000,staff:250});
});
function fixture({plan='FREEMIUM',status='ACTIVE',students=0,staff=0,trialUsed=false,auditError=false,ends=null}={}){
 let school={id:'school1',subscriptionPlan:plan,subscriptionStatus:status,billingCycle:'MONTHLY',paidTrialUsed:trialUsed,subscriptionEndsAt:ends};
 const calls=[];const payments=[];
 const tx={
  $queryRaw:async(strings,...values)=>{calls.push(['lock',strings.join('?'),values]);return [{id:'school1'}];},
  tenant:{findUnique:async()=>school,update:async({data})=>{calls.push(['school',data]);school={...school,...data};return school;}},
  student:{count:async({where})=>{calls.push(['students',where]);return students;}},staff:{count:async({where})=>{calls.push(['staff',where]);return staff;}},
  subscriptionPayment:{findFirst:async({where})=>payments.filter(p=>p.tenantId===where.tenantId&&p.plan===where.plan&&p.billingCycle===where.billingCycle&&p.periodEnd>where.periodEnd.gt).sort((a,b)=>b.periodEnd-a.periodEnd)[0]||null,findUnique:async({where})=>payments.find(p=>p.idempotencyKey===where.idempotencyKey)||null,create:async({data})=>{if(payments.some(p=>p.paymentReference===data.paymentReference&&p.paymentMethod===data.paymentMethod))throw Object.assign(new Error('duplicate'),{code:'P2002'});const p={...data,id:`payment${payments.length+1}`};payments.push(p);calls.push(['payment',p]);return p;}},
  auditLog:{create:async()=>{calls.push(['audit']);if(auditError)throw new Error('audit unavailable');}},
 };
 const db={...tx,$transaction:async fn=>{const prior=structuredClone(school);const length=payments.length;calls.push(['begin']);try{const result=await fn(tx);calls.push(['commit']);return result;}catch(error){school=prior;payments.splice(length);calls.push(['rollback']);throw error;}}};
 return {service:createSubscriptionService(db,()=>new Date('2026-10-28T12:00:00Z')),tx,calls,payments,get school(){return school;}};
}
const operator={userId:'platform-admin'};
const payment={plan:'STARTER',billingCycle:'MONTHLY',amount:400,paymentMethod:'MOBILE_MONEY',paymentReference:'MM-TEST-1',idempotencyKey:'5aca01dc-c79a-4f19-8401-e3dcba9d5af1',verified:true};
test('capacity acquires the shared Tenant row lock before counting, including non-deleted inactive records',async()=>{
 const f=fixture({students:49});await assertSchoolCapacity(f.tx,'school1','student');
 assert.equal(f.calls[0][0],'lock');assert.match(f.calls[0][1],/FOR UPDATE/);assert.deepEqual(f.calls[0][2],['school1']);
 assert.deepEqual(f.calls.find(([name])=>name==='students')[1],{tenantId:'school1',deletedAt:null});
 await assert.rejects(assertSchoolCapacity(fixture({students:50}).tx,'school1','student'),{code:'PLAN_CAPACITY_REACHED'});
 await assert.rejects(assertSchoolCapacity(fixture({staff:5}).tx,'school1','staff'),{code:'PLAN_CAPACITY_REACHED'});
});
test('approval starts exactly one 14-day trial and rejects repeat trials',async()=>{
 const f=fixture();await f.service.manage(operator,'school1',{subscriptionPlan:'PROFESSIONAL',subscriptionStatus:'TRIAL',billingCycle:'ANNUAL'});
 assert.equal(f.school.subscriptionEndsAt.toISOString(),'2026-11-11T12:00:00.000Z');assert.equal(f.school.paidTrialUsed,true);
 await assert.rejects(f.service.manage(operator,'school1',{subscriptionPlan:'STARTER',subscriptionStatus:'TRIAL',billingCycle:'MONTHLY'}),{code:'TRIAL_ALREADY_USED'});
});
test('plan downgrades cannot strand usage over the target capacity',async()=>{
 const f=fixture({plan:'STARTER',students:51});
 await assert.rejects(f.service.manage(operator,'school1',{subscriptionPlan:'FREEMIUM',subscriptionStatus:'ACTIVE',billingCycle:'MONTHLY'}),{code:'PLAN_BELOW_USAGE'});
 assert.equal(f.school.subscriptionPlan,'STARTER');
});
test('paid activation requires verified full payment and commits access with audit',async()=>{
 const f=fixture();
 await assert.rejects(f.service.manage(operator,'school1',{subscriptionPlan:'STARTER',subscriptionStatus:'ACTIVE',billingCycle:'MONTHLY'}),{code:'VERIFIED_PAYMENT_REQUIRED'});
 await assert.rejects(f.service.payment(operator,'school1',{...payment,verified:false}),{code:'PAYMENT_VERIFICATION_REQUIRED'});
 await assert.rejects(f.service.payment(operator,'school1',{...payment,amount:1}),{code:'SUBSCRIPTION_AMOUNT_MISMATCH'});
 const result=await f.service.payment(operator,'school1',payment);
 assert.equal(result.school.subscriptionStatus,'ACTIVE');assert.equal(result.school.subscriptionEndsAt.toISOString(),'2026-11-28T12:00:00.000Z');
 assert.ok(f.calls.some(([name])=>name==='audit'));assert.equal(f.payments.length,1);
});
test('same payment request replays without extending access twice; altered key reuse fails',async()=>{
 const f=fixture();await f.service.payment(operator,'school1',payment);const end=f.school.subscriptionEndsAt.toISOString();
 const replay=await f.service.payment(operator,'school1',payment);assert.equal(replay.replayed,true);assert.equal(f.payments.length,1);assert.equal(f.school.subscriptionEndsAt.toISOString(),end);
 await assert.rejects(f.service.payment(operator,'school1',{...payment,amount:750}),{code:'IDEMPOTENCY_CONFLICT'});
 await assert.rejects(f.service.payment(operator,'school1',{...payment,idempotencyKey:'another-key'}),{code:'DUPLICATE_SUBSCRIPTION_PAYMENT'});
});
test('renewal extends an active period and annual amount is ten monthly payments',async()=>{
 const f=fixture({plan:'STARTER',ends:new Date('2026-11-28T12:00:00Z')});
 await f.service.payment(operator,'school1',payment);assert.equal(f.school.subscriptionEndsAt.toISOString(),'2026-12-28T12:00:00.000Z');
 const annual=fixture();await annual.service.payment(operator,'school1',{...payment,billingCycle:'ANNUAL',amount:4000});assert.equal(annual.school.subscriptionEndsAt.toISOString(),'2027-10-28T12:00:00.000Z');
});
test('mid-period tier/cycle changes require review instead of silently prorating',async()=>{
 const f=fixture({plan:'STARTER',ends:new Date('2026-11-28T12:00:00Z')});
 await assert.rejects(f.service.payment(operator,'school1',{...payment,plan:'PROFESSIONAL',amount:750}),{code:'PAID_PERIOD_IN_PROGRESS'});
});
test('Enterprise needs explicit capacities and price before trial or payment',async()=>{
 const f=fixture();
 await assert.rejects(f.service.manage(operator,'school1',{subscriptionPlan:'ENTERPRISE',subscriptionStatus:'TRIAL',billingCycle:'MONTHLY'}),{code:'ENTERPRISE_QUOTE_REQUIRED'});
 await f.service.manage(operator,'school1',{subscriptionPlan:'ENTERPRISE',subscriptionStatus:'TRIAL',billingCycle:'MONTHLY',quoteOnly:true,enterpriseStudentLimit:2000,enterpriseStaffLimit:200,enterprisePrice:1200});
 assert.equal(f.school.subscriptionPlan,'FREEMIUM');
 await f.service.payment(operator,'school1',{...payment,plan:'ENTERPRISE',amount:1200});assert.equal(f.school.subscriptionPlan,'ENTERPRISE');
});
test('audit failure rolls back both subscription payment and access grant',async()=>{
 const f=fixture({auditError:true});await assert.rejects(f.service.payment(operator,'school1',payment),/audit unavailable/);
 assert.equal(f.payments.length,0);assert.equal(f.school.subscriptionPlan,'FREEMIUM');
});
test('subscription inputs cannot override currency, paid end dates, verification or precision',()=>{
 const env=body=>({body,params:{id:'school1'},query:{}});
 assert.equal(subscriptionPaymentSchema.safeParse(env(payment)).success,true);
 assert.equal(subscriptionPaymentSchema.safeParse(env({...payment,verified:false})).success,false);
 assert.equal(subscriptionPaymentSchema.safeParse(env({...payment,currency:'USD'})).success,false);
 assert.equal(subscriptionPaymentSchema.safeParse(env({...payment,amount:400.001})).success,false);
 assert.equal(subscriptionSchema.safeParse(env({subscriptionPlan:'STARTER',subscriptionStatus:'ACTIVE',subscriptionEndsAt:'2099-01-01'})).success,false);
});

test('cedi amounts render as the Ghana currency symbol without encoding artifacts',()=>{assert.equal(money(4000),'GH\u20b54,000');});
test('paid access can be restored from its ledger without a second charge',async()=>{
 const f=fixture();await f.service.payment(operator,'school1',payment);
 const end=f.school.subscriptionEndsAt.toISOString();
 await f.service.manage(operator,'school1',{subscriptionPlan:'STARTER',subscriptionStatus:'PAST_DUE',billingCycle:'MONTHLY'});
 await f.service.manage(operator,'school1',{subscriptionPlan:'STARTER',subscriptionStatus:'ACTIVE',billingCycle:'MONTHLY'});
 assert.equal(f.school.subscriptionEndsAt.toISOString(),end);assert.equal(f.payments.length,1);
});
test('an active paid period cannot be replaced with Freemium before its end',async()=>{
 const f=fixture({plan:'STARTER',ends:new Date('2026-11-28T12:00:00Z')});
 await assert.rejects(f.service.manage(operator,'school1',{subscriptionPlan:'FREEMIUM',subscriptionStatus:'ACTIVE',billingCycle:'MONTHLY'}),{code:'PAID_PERIOD_IN_PROGRESS'});
});

test('existing school plan requests store review metadata without granting entitlements',async()=>{
 const f=fixture();const result=await f.service.request({userId:'school-admin',tenantId:'school1'},{plan:'PROFESSIONAL',billingCycle:'ANNUAL'});
 assert.equal(result.currentPlan,'FREEMIUM');assert.equal(f.school.subscriptionPlan,'FREEMIUM');assert.equal(f.school.requestedSubscriptionPlan,'PROFESSIONAL');assert.equal(f.school.billingCycle,'ANNUAL');assert.equal(f.payments.length,0);
});
test('existing paid schools cannot change billing cycles through a review request mid-period',async()=>{
 const f=fixture({plan:'STARTER',ends:new Date('2026-11-28T12:00:00Z')});
 await assert.rejects(f.service.request({userId:'school-admin',tenantId:'school1'},{plan:'PROFESSIONAL',billingCycle:'ANNUAL'}),{code:'PAID_PERIOD_IN_PROGRESS'});
 assert.equal(f.school.billingCycle,'MONTHLY');
});
