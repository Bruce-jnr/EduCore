import { AppError } from '../../errors/app-error.js';
import { LESSON_PRICES,lessonProduct } from '../../../shared/lesson-pricing.js';
async function ownPlan(db,teacher,id) {
 const plan=await db.personalLessonPlan.findFirst({where:{id,teacherId:teacher.id}});
 if(!plan)throw new AppError('Personal lesson plan not found.',404,'LESSON_PLAN_NOT_FOUND');return plan;
}
async function lockTeacher(tx,id) {
 await tx.$queryRaw`SELECT id FROM TeacherAccount WHERE id=${id} FOR UPDATE`;
 const teacher=await tx.teacherAccount.findUnique({where:{id}});
 if(!teacher?.isActive)throw new AppError('Teacher account is inactive.',403,'TEACHER_ACCOUNT_UNAVAILABLE');
}
function price(plan) {
 const product=lessonProduct(plan.classKey),item=LESSON_PRICES[product];
 if(!item?.enabled)throw new AppError('This lesson product is not available for purchase.',422,'LESSON_PRODUCT_UNAVAILABLE');
 return {product,amount:item.amount,currency:'GHS'};
}
export function createLessonBilling(db,now=()=>new Date()) {
 return {
  async quote(teacher,planId) {
   const plan=await ownPlan(db,teacher,planId),pricing=price(plan);
   const purchase=await db.teacherLessonPurchase.findUnique({where:{planId}});
   return {...pricing,planId,status:purchase?.status||'NONE',purchaseId:purchase?.id||null,paid:purchase?.teacherId===teacher.id&&purchase.status==='PAID',amount:purchase?Number(purchase.amount):pricing.amount};
  },
  async request(teacher,input) {
   try {return await db.$transaction(async tx=>{
    await lockTeacher(tx,teacher.id);const plan=await ownPlan(tx,teacher,input.planId),pricing=price(plan);
    const replay=await tx.teacherLessonPurchase.findUnique({where:{idempotencyKey:input.idempotencyKey}});
    if(replay){if(replay.teacherId!==teacher.id||replay.planId!==plan.id)throw new AppError('This request key belongs to another purchase.',409,'IDEMPOTENCY_CONFLICT');return replay;}
    const existing=await tx.teacherLessonPurchase.findUnique({where:{planId:plan.id}});if(existing)return existing;
    const purchase=await tx.teacherLessonPurchase.create({data:{teacherId:teacher.id,planId:plan.id,...pricing,idempotencyKey:input.idempotencyKey}});
    await tx.teacherActivity.create({data:{teacherId:teacher.id,action:'REQUEST_LESSON_EXPORT',planId:plan.id}});return purchase;
   });}catch(error){if(error.code==='P2002')throw new AppError('A purchase for this booklet or request already exists. Refresh its payment status.',409,'DUPLICATE_LESSON_PURCHASE');throw error;}
  },
  async requirePaid(teacher,planId) {
   await ownPlan(db,teacher,planId);
   const purchase=await db.teacherLessonPurchase.findUnique({where:{planId}});
   if(!purchase||purchase.teacherId!==teacher.id||purchase.status!=='PAID')throw new AppError('Complete the one-time export payment for this booklet before opening its printable PDF/JSON preview.',402,'LESSON_EXPORT_PAYMENT_REQUIRED');
  },
  async verify(operator,id,input) {
   if(input.verified!==true)throw new AppError('Verify receipt before confirming this payment.',422,'PAYMENT_VERIFICATION_REQUIRED');
   const candidate=await db.teacherLessonPurchase.findUnique({where:{id}});
   if(!candidate)throw new AppError('Lesson purchase not found.',404,'LESSON_PURCHASE_NOT_FOUND');
   try{return await db.$transaction(async tx=>{
    await lockTeacher(tx,candidate.teacherId);
    return applyLessonPayment(tx,operator,id,input,now);
   });}catch(error){if(error.code==='P2002')throw new AppError('This payment reference has already been used for a lesson purchase.',409,'DUPLICATE_LESSON_PAYMENT');throw error;}
  },
  list(status='PENDING') {return db.teacherLessonPurchase.findMany({where:{status},include:{teacher:{select:{id:true,firstName:true,lastName:true,email:true}},plan:{select:{id:true,title:true,className:true,subjectName:true,termName:true,academicYearName:true}}},orderBy:{createdAt:'desc'},take:100});},
 };
}

export async function applyLessonPayment(tx,operator,id,input,now=()=>new Date()) {
    const purchase=await tx.teacherLessonPurchase.findUnique({where:{id}});
    if(Number(purchase.amount)!==input.amount)throw new AppError('The verified amount must match the booklet price.',422,'LESSON_AMOUNT_MISMATCH');
    if(purchase.status==='PAID'){
     if(purchase.paymentMethod!==input.paymentMethod||purchase.paymentReference!==input.paymentReference)throw new AppError('This booklet payment was already verified with another reference.',409,'LESSON_PAYMENT_ALREADY_VERIFIED');return purchase;
    }
    const paid=await tx.teacherLessonPurchase.update({where:{id},data:{status:'PAID',paymentMethod:input.paymentMethod,paymentReference:input.paymentReference,verifiedById:operator.userId||'PAYSTACK',verifiedAt:now()}});
    await tx.auditLog.create({data:{userId:operator.userId||null,module:'TEACHER_BILLING',action:'VERIFY_LESSON_PAYMENT',entityType:'TeacherLessonPurchase',entityId:id,newValue:{teacherId:paid.teacherId,planId:paid.planId,amount:Number(paid.amount),currency:'GHS',verificationSource:input.source||'MANUAL'}}});
    await tx.teacherActivity.create({data:{teacherId:paid.teacherId,action:'LESSON_EXPORT_UNLOCKED',planId:paid.planId}});return paid;
}
