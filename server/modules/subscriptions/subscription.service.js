import { AppError } from '../../errors/app-error.js';
import { PAID_TRIAL_DAYS,planPrice,billingPeriodEnd } from '../../../shared/pricing.js';
import { lockSchool,assertPlanFits } from './plan-policy.js';
const snapshot=school=>({plan:school.subscriptionPlan,status:school.subscriptionStatus,billingCycle:school.billingCycle,endsAt:school.subscriptionEndsAt?.toISOString?.() || null});
function enterprise(input,school) {
  if(input.subscriptionPlan!=='ENTERPRISE')return {};
  const values={enterpriseStudentLimit:input.enterpriseStudentLimit??school.enterpriseStudentLimit,enterpriseStaffLimit:input.enterpriseStaffLimit??school.enterpriseStaffLimit,enterprisePrice:input.enterprisePrice??school.enterprisePrice};
  if(!values.enterpriseStudentLimit||!values.enterpriseStaffLimit||!values.enterprisePrice||Number(values.enterprisePrice)<=0)throw new AppError('Set the agreed Enterprise student limit, staff limit and billing-period price first.',422,'ENTERPRISE_QUOTE_REQUIRED');
  return values;
}
const audit=(tx,auth,tenant,action,extra={})=>tx.auditLog.create({data:{userId:auth.userId,tenantId:tenant.id,module:'SUBSCRIPTIONS',action,entityType:'Tenant',entityId:tenant.id,newValue:{...snapshot(tenant),...extra}}});
export function createSubscriptionService(db,now=()=>new Date()) {
  return {
    async request(auth,input) {
      return db.$transaction(async tx=>{
        const school=await lockSchool(tx,auth.tenantId);
        const paidActive=school.subscriptionStatus==='ACTIVE'&&school.subscriptionPlan!=='FREEMIUM'&&school.subscriptionEndsAt>now();
        if(paidActive&&input.billingCycle!==school.billingCycle)throw new AppError('Billing-cycle changes can be requested after the current paid period ends.',409,'PAID_PERIOD_IN_PROGRESS');
        const updated=await tx.tenant.update({where:{id:school.id},data:{requestedSubscriptionPlan:input.plan,...(!paidActive&&{billingCycle:input.billingCycle})}});
        await audit(tx,auth,updated,'REQUEST_PLAN_REVIEW',{requestedPlan:input.plan,requestedBillingCycle:input.billingCycle});
        return {requestedPlan:input.plan,billingCycle:input.billingCycle,currentPlan:school.subscriptionPlan};
      });
    },
    async manage(auth,id,input) {
      return db.$transaction(async tx=>{
        const school=await lockSchool(tx,id);
        if(input.quoteOnly) {
          if(input.subscriptionPlan!=='ENTERPRISE')throw new AppError('Quote configuration is for Enterprise only.',422,'ENTERPRISE_QUOTE_REQUIRED');
          if(school.subscriptionStatus==='ACTIVE'&&school.subscriptionEndsAt>now()&&input.billingCycle!==school.billingCycle)throw new AppError('Review billing-cycle changes at the end of the paid period.',409,'PAID_PERIOD_IN_PROGRESS');
          const quote=enterprise(input,school);await assertPlanFits(tx,{...school,subscriptionPlan:'ENTERPRISE',...quote});
          const quoted=await tx.tenant.update({where:{id},data:{...quote,billingCycle:input.billingCycle}});await audit(tx,auth,quoted,'UPDATE_ENTERPRISE_QUOTE',{enterpriseStudentLimit:quote.enterpriseStudentLimit,enterpriseStaffLimit:quote.enterpriseStaffLimit,enterprisePrice:Number(quote.enterprisePrice)});return quoted;
        }
        const data={subscriptionPlan:input.subscriptionPlan,billingCycle:input.billingCycle,...(input.subscriptionStatus==='TRIAL'?enterprise(input,school):{})};
        if(school.subscriptionStatus==='ACTIVE'&&school.subscriptionPlan!=='FREEMIUM'&&school.subscriptionEndsAt>now()&&['TRIAL','ACTIVE'].includes(input.subscriptionStatus)&&input.subscriptionPlan!==school.subscriptionPlan)throw new AppError('Plan changes take effect after the current paid period.',409,'PAID_PERIOD_IN_PROGRESS');
        if(input.subscriptionPlan==='TRIAL')throw new AppError('Select Starter, Professional or Enterprise for a paid-plan trial.',422,'PAID_PLAN_REQUIRED');
        if(input.subscriptionStatus==='TRIAL') {
          if(input.subscriptionPlan==='FREEMIUM')throw new AppError('Freemium does not need a trial.',422,'INVALID_FREE_TRIAL');
          if(school.paidTrialUsed)throw new AppError('This school has already used its paid-plan trial.',409,'TRIAL_ALREADY_USED');
          const start=now(),end=new Date(start.getTime()+PAID_TRIAL_DAYS*86400000);
          Object.assign(data,{subscriptionStatus:'TRIAL',trialStartedAt:start,trialEndsAt:end,subscriptionStartedAt:null,subscriptionEndsAt:end,paidTrialUsed:true,requestedSubscriptionPlan:null});
        } else if(input.subscriptionStatus==='ACTIVE') {
          if(input.subscriptionPlan==='FREEMIUM')Object.assign(data,{subscriptionStatus:'ACTIVE',subscriptionStartedAt:null,subscriptionEndsAt:null,trialEndsAt:null,requestedSubscriptionPlan:null});
          else {
            const paid=await tx.subscriptionPayment.findFirst({where:{tenantId:id,plan:input.subscriptionPlan,billingCycle:input.billingCycle,periodEnd:{gt:now()}},orderBy:{periodEnd:'desc'}});
            if(!paid)throw new AppError('Paid plans must be activated by recording a verified subscription payment.',422,'VERIFIED_PAYMENT_REQUIRED');
            Object.assign(data,{subscriptionStatus:'ACTIVE',subscriptionStartedAt:paid.periodStart,subscriptionEndsAt:paid.periodEnd,requestedSubscriptionPlan:null});
          }
        } else if(['CANCELLED','EXPIRED','PAST_DUE'].includes(input.subscriptionStatus)) {
          // Status-only actions may not switch plans or quotes without usage/payment review.
          if(input.subscriptionPlan!==school.subscriptionPlan)throw new AppError('Keep the current plan when suspending subscription access.',422,'INVALID_STATUS_CHANGE');
          Object.assign(data,{subscriptionStatus:input.subscriptionStatus,billingCycle:school.billingCycle});
        } else throw new AppError('Invalid subscription action.',422,'INVALID_SUBSCRIPTION_ACTION');
        if(['ACTIVE','TRIAL'].includes(data.subscriptionStatus))await assertPlanFits(tx,{...school,...data});
        const updated=await tx.tenant.update({where:{id},data});await audit(tx,auth,updated,'MANAGE_SUBSCRIPTION');return updated;
      });
    },
    async payment(auth,id,input) {
      if(input.verified!==true)throw new AppError('Confirm independent receipt verification before recording payment.',422,'PAYMENT_VERIFICATION_REQUIRED');
      try {
        return await db.$transaction(async tx=>{
          return applySubscriptionPayment(tx,auth,id,input,now);
        });
      } catch(error) {if(error.code==='P2002')throw new AppError('This payment reference or request has already been recorded. Check subscription payment history.',409,'DUPLICATE_SUBSCRIPTION_PAYMENT');throw error;}
    },
    history(id) { return db.subscriptionPayment.findMany({where:{tenantId:id},orderBy:{createdAt:'desc'},take:50}); },
  };
}

export async function applySubscriptionPayment(tx,auth,id,input,now=()=>new Date()) {
          const school=await lockSchool(tx,id);
          const previous=await tx.subscriptionPayment.findUnique({where:{idempotencyKey:input.idempotencyKey}});
          if(previous) {
            if(previous.tenantId!==id||previous.plan!==input.plan||previous.billingCycle!==input.billingCycle||previous.paymentReference!==input.paymentReference||previous.paymentMethod!==input.paymentMethod||Number(previous.amount)!==input.amount)throw new AppError('This request key was already used for a different subscription payment.',409,'IDEMPOTENCY_CONFLICT');
            return {school,payment:previous,replayed:true};
          }
          if(input.plan==='FREEMIUM'||input.plan==='TRIAL')throw new AppError('Choose a paid plan.',422,'PAID_PLAN_REQUIRED');
          const quote=enterprise({...input,subscriptionPlan:input.plan},school);
          if(input.plan==='ENTERPRISE'&&input.billingCycle!==school.billingCycle)throw new AppError('Review the Enterprise quote for this billing cycle first.',422,'ENTERPRISE_QUOTE_REQUIRED');
          const expected=input.plan==='ENTERPRISE'?Number(quote.enterprisePrice):planPrice(input.plan,input.billingCycle);
          if(expected===null||input.amount!==expected)throw new AppError(`The verified amount must equal the agreed ${input.billingCycle.toLowerCase()} plan price.`,422,'SUBSCRIPTION_AMOUNT_MISMATCH');
          if(school.subscriptionStatus==='ACTIVE'&&school.subscriptionEndsAt>now()&&(school.subscriptionPlan!==input.plan||school.billingCycle!==input.billingCycle))throw new AppError('Plan or billing-cycle changes take effect after the current paid period. No automatic proration is applied.',409,'PAID_PERIOD_IN_PROGRESS');
          await assertPlanFits(tx,{...school,subscriptionPlan:input.plan,...quote});
          const start=school.subscriptionStatus==='ACTIVE'&&school.subscriptionEndsAt>now()?school.subscriptionEndsAt:now();
          const end=billingPeriodEnd(start,input.billingCycle);
          const payment=await tx.subscriptionPayment.create({data:{tenantId:id,plan:input.plan,billingCycle:input.billingCycle,amount:input.amount,currency:'GHS',paymentMethod:input.paymentMethod,paymentReference:input.paymentReference,idempotencyKey:input.idempotencyKey,periodStart:start,periodEnd:end,verifiedById:auth.userId}});
          const updated=await tx.tenant.update({where:{id},data:{subscriptionPlan:input.plan,subscriptionStatus:'ACTIVE',paidTrialUsed:true,billingCycle:input.billingCycle,subscriptionStartedAt:school.subscriptionStatus==='ACTIVE'?(school.subscriptionStartedAt||start):start,subscriptionEndsAt:end,requestedSubscriptionPlan:null,...quote}});
          await audit(tx,auth,updated,'VERIFY_SUBSCRIPTION_PAYMENT',{paymentId:payment.id,amount:input.amount,currency:'GHS',verificationSource:input.source||'MANUAL'});
          return {school:updated,payment,replayed:false};
}
