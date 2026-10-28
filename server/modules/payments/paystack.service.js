import {randomBytes} from 'node:crypto';
import {AppError} from '../../errors/app-error.js';
import {planPrice} from '../../../shared/pricing.js';
import {lockSchool,assertPlanFits} from '../subscriptions/plan-policy.js';
import {applySubscriptionPayment} from '../subscriptions/subscription.service.js';
import {applyLessonPayment,createLessonBilling} from '../teachers/lesson-billing.service.js';
import {toMinor} from './paystack-client.js';
export const paymentReferencePattern=/^edupal-[a-f0-9]{40}$/;
const result=p=>({reference:p.reference,purpose:p.purpose,status:p.status,amount:Number(p.amountMinor)/100,currency:p.currency,mode:p.mode,authorizationUrl:p.status==='PENDING'?p.authorizationUrl:null,lessonPlanId:p.lessonPlanId||null,lastErrorCode:p.lastErrorCode||null});
async function lockOwner(tx,p) {
 if(p.purpose==='SCHOOL_SUBSCRIPTION')return lockSchool(tx,p.tenantId);
 await tx.$queryRaw`SELECT id FROM TeacherAccount WHERE id=${p.teacherId} FOR UPDATE`;
 const teacher=await tx.teacherAccount.findUnique({where:{id:p.teacherId}});if(!teacher?.isActive)throw new AppError('Teacher account is inactive.',403,'TEACHER_ACCOUNT_UNAVAILABLE');return teacher;
}
export function schoolCheckoutQuote(school) {
 const plan=school.subscriptionPlan==='TRIAL'?'PROFESSIONAL':school.subscriptionPlan;
 const amount=plan==='ENTERPRISE'?Number(school.enterprisePrice):planPrice(plan,school.billingCycle);
 return {plan,billingCycle:school.billingCycle,amount:amount||0,currency:'GHS',canPay:school.isActive!==false&&['STARTER','PROFESSIONAL','ENTERPRISE'].includes(plan)&&Number(amount)>0,requestedPlan:school.requestedSubscriptionPlan||null,subscriptionStatus:school.subscriptionStatus,subscriptionEndsAt:school.subscriptionEndsAt};
}
export function createPaystackService({db,client,callbackUrl,now=()=>new Date()}) {
 const lessons=createLessonBilling(db);
 function requireConfig(){if(!client.mode)throw new AppError('Paystack checkout is not configured.',503,'PAYSTACK_NOT_CONFIGURED');if(!callbackUrl)throw new AppError('Configure the public API URL before accepting payments.',503,'PAYSTACK_CALLBACK_NOT_CONFIGURED');}
 async function reserve(data,key) {
  return db.$transaction(async tx=>{
   const owner=await lockOwner(tx,data);
   if(data.purpose==='SCHOOL_SUBSCRIPTION') {
    const quote=schoolCheckoutQuote(owner);if(!quote.canPay||quote.plan!==data.plan||quote.billingCycle!==data.billingCycle||toMinor(quote.amount)!==Number(data.amountMinor))throw new AppError('Your approved school plan changed. Refresh billing before paying.',409,'CHECKOUT_TERMS_CHANGED');
    if(owner.subscriptionPlan==='ENTERPRISE'&&(!owner.enterpriseStudentLimit||!owner.enterpriseStaffLimit))throw new AppError('The Enterprise quote needs explicit capacities.',422,'ENTERPRISE_QUOTE_REQUIRED');
    await assertPlanFits(tx,{...owner,subscriptionPlan:quote.plan});
   } else {
    const purchase=await tx.teacherLessonPurchase.findUnique({where:{id:data.lessonPurchaseId}});
    if(!purchase||purchase.teacherId!==data.teacherId||purchase.status==='PAID')throw new AppError('This booklet is already paid or unavailable.',409,'BOOKLET_ALREADY_PAID');
   }
   const replay=await tx.paystackPayment.findUnique({where:{idempotencyKey:key}});
   const active=await tx.paystackPayment.findUnique({where:{activeKey:data.activeKey}});
   const existing=replay||active;
   if(existing) {
    if(existing.purpose!==data.purpose||existing.teacherId!==data.teacherId||existing.tenantId!==data.tenantId||existing.lessonPurchaseId!==data.lessonPurchaseId||existing.plan!==data.plan||existing.billingCycle!==data.billingCycle||existing.mode!==data.mode||Number(existing.amountMinor)!==Number(data.amountMinor))throw new AppError('An existing checkout has different terms. Verify it before starting another payment.',409,'CHECKOUT_TERMS_CHANGED');
    if(!replay&&existing.status==='INITIALIZING'&&now()-existing.updatedAt>120000&&!existing.authorizationUrl){await tx.paystackPayment.update({where:{id:existing.id},data:{status:'FAILED',activeKey:null,lastErrorCode:'INITIALIZATION_EXPIRED'}});}else return {payment:existing,created:false};
   }
   return {payment:await tx.paystackPayment.create({data:{...data,idempotencyKey:key,reference:`edupal-${randomBytes(20).toString('hex')}`,status:'INITIALIZING'}}),created:true};
  });
 }
 async function initialize(data,key) {
  requireConfig();let reservation;
  try{reservation=await reserve(data,key);}catch(error){if(error.code==='P2002')throw new AppError('A checkout is already being prepared. Refresh its status.',409,'CHECKOUT_IN_PROGRESS');throw error;}
  const p=reservation.payment;if(!reservation.created)return result(p);
  try {
   const checkout=await client.initialize({id:p.id,reference:p.reference,purpose:p.purpose,email:p.payerEmail,amountMinor:Number(p.amountMinor),callbackUrl});
   await db.paystackPayment.updateMany({where:{id:p.id,status:'INITIALIZING'},data:{authorizationUrl:checkout.authorizationUrl,status:'PENDING'}});
   return result(await db.paystackPayment.findUnique({where:{id:p.id}}));
  }catch(error){await db.paystackPayment.updateMany({where:{id:p.id,status:'INITIALIZING'},data:{status:'FAILED',activeKey:null,lastErrorCode:'INITIALIZATION_FAILED'}});throw error;}
 }
 async function local(reference){if(!paymentReferencePattern.test(reference))throw new AppError('Invalid payment reference.',422,'INVALID_PAYMENT_REFERENCE');const p=await db.paystackPayment.findUnique({where:{reference}});if(!p)throw new AppError('Payment not found.',404,'PAYMENT_NOT_FOUND');return p;}
 function own(p,actor,kind){if(p.purpose!==kind||(kind==='LESSON_EXPORT'?p.teacherId!==actor.id:p.tenantId!==actor.tenantId))throw new AppError('Payment not found.',404,'PAYMENT_NOT_FOUND');}
 function proof(p,data) {
  let metadata=data.metadata;if(typeof metadata==='string'){try{metadata=JSON.parse(metadata);}catch{metadata=null;}}
  return data.reference===p.reference&&Number.isSafeInteger(data.amount)&&data.amount===Number(p.amountMinor)&&data.currency==='GHS'&&data.domain===p.mode.toLowerCase()&&String(data.customer?.email||'').trim().toLowerCase()===p.payerEmail.toLowerCase()&&metadata?.application==='edupalgh'&&metadata.paymentId===p.id&&metadata.purpose===p.purpose;
 }
 async function settle(reference) {
  const candidate=await local(reference);if(candidate.status==='FULFILLED')return result(candidate);
  if(candidate.mode!==client.mode)throw new AppError('This payment belongs to a different Paystack mode.',409,'PAYMENT_MODE_MISMATCH');
  const verified=await client.verify(reference);
  if(verified.status!=='success') {
   const failed=['failed','abandoned'].includes(verified.status);
   await db.paystackPayment.updateMany({where:{id:candidate.id,status:{not:'FULFILLED'}},data:{providerStatus:String(verified.status||'unknown').slice(0,30),...(failed&&{status:'FAILED',activeKey:null})}});
   return result(await db.paystackPayment.findUnique({where:{id:candidate.id}}));
  }
  if(!proof(candidate,verified)) {
   await db.paystackPayment.updateMany({where:{id:candidate.id,status:{not:'FULFILLED'}},data:{status:'REVIEW',providerStatus:'success',lastErrorCode:'PROVIDER_PROOF_MISMATCH',verifiedAt:now()}});
   return result(await db.paystackPayment.findUnique({where:{id:candidate.id}}));
  }
  const method={card:'CARD',mobile_money:'MOBILE_MONEY',bank_transfer:'BANK_TRANSFER',bank:'BANK_TRANSFER'}[verified.channel]||'OTHER';
  try {
   return await db.$transaction(async tx=>{
    const owner=await lockOwner(tx,candidate);
    if(candidate.purpose==='SCHOOL_SUBSCRIPTION'){const quote=schoolCheckoutQuote(owner);if(!quote.canPay||quote.plan!==candidate.plan||quote.billingCycle!==candidate.billingCycle||toMinor(quote.amount)!==Number(candidate.amountMinor))throw new AppError('Approved plan changed; payment requires review.',409,'CHECKOUT_TERMS_CHANGED');}
    await tx.$queryRaw`SELECT id FROM PaystackPayment WHERE id=${candidate.id} FOR UPDATE`;
    const p=await tx.paystackPayment.findUnique({where:{id:candidate.id}});if(p.status==='FULFILLED')return result(p);
    const receipt={verified:true,amount:Number(p.amountMinor)/100,paymentMethod:method,paymentReference:`PAYSTACK:${p.reference}`,source:'PAYSTACK'};
    if(p.purpose==='LESSON_EXPORT')await applyLessonPayment(tx,{userId:null},p.lessonPurchaseId,receipt,now);
    else await applySubscriptionPayment(tx,{userId:p.userId},p.tenantId,{...receipt,plan:p.plan,billingCycle:p.billingCycle,idempotencyKey:p.idempotencyKey},now);
    const fulfilled=await tx.paystackPayment.update({where:{id:p.id},data:{status:'FULFILLED',activeKey:null,providerStatus:'success',lastErrorCode:null,verifiedAt:now(),fulfilledAt:now()}});return result(fulfilled);
   });
  }catch(error){
   if(!(error instanceof AppError)&&error.code!=='P2002')throw error;
   await db.paystackPayment.updateMany({where:{id:candidate.id,status:{not:'FULFILLED'}},data:{status:'REVIEW',providerStatus:'success',verifiedAt:now(),lastErrorCode:error.code||'FULFILMENT_REVIEW_REQUIRED'}});
   return result(await db.paystackPayment.findUnique({where:{id:candidate.id}}));
  }
 }
 return {
  async initializeLesson(teacher,input){requireConfig();const purchase=await lessons.request(teacher,input);return initialize({purpose:'LESSON_EXPORT',teacherId:teacher.id,tenantId:null,userId:null,lessonPurchaseId:purchase.id,lessonPlanId:purchase.planId,plan:null,billingCycle:null,activeKey:`lesson:${purchase.id}`,amountMinor:BigInt(toMinor(purchase.amount)),currency:'GHS',mode:client.mode,payerEmail:teacher.email.toLowerCase()},input.idempotencyKey);},
  async initializeSchool(actor,input){requireConfig();const school=await db.tenant.findUnique({where:{id:actor.tenantId}});const quote=school&&schoolCheckoutQuote(school);if(!quote?.canPay)throw new AppError('A paid school plan must be approved before checkout.',403,'PLAN_APPROVAL_REQUIRED');return initialize({purpose:'SCHOOL_SUBSCRIPTION',tenantId:school.id,userId:actor.userId,teacherId:null,lessonPurchaseId:null,lessonPlanId:null,plan:quote.plan,billingCycle:quote.billingCycle,activeKey:`school:${school.id}`,amountMinor:BigInt(toMinor(quote.amount)),currency:'GHS',mode:client.mode,payerEmail:actor.email.toLowerCase()},input.idempotencyKey);},
  async verifyLesson(teacher,reference){const p=await local(reference);own(p,teacher,'LESSON_EXPORT');return settle(reference);},
  async verifySchool(actor,reference){const p=await local(reference);own(p,actor,'SCHOOL_SUBSCRIPTION');return settle(reference);},
  reconcile:settle,
  async webhook(reference){if(!paymentReferencePattern.test(reference))return null;const p=await db.paystackPayment.findUnique({where:{reference}});return p?settle(reference):null;},
  list(){return db.paystackPayment.findMany({orderBy:{createdAt:'desc'},take:100,select:{reference:true,purpose:true,status:true,amountMinor:true,currency:true,mode:true,payerEmail:true,lastErrorCode:true,createdAt:true}}).then(items=>items.map(p=>({...p,amountMinor:Number(p.amountMinor)})));},
 };
}
