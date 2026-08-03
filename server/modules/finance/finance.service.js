import{randomUUID}from'node:crypto';import{Prisma}from'@prisma/client';import{prisma}from'../../config/prisma.js';import{AppError}from'../../errors/app-error.js';import{auditService}from'../../services/audit.service.js';
const D=Prisma.Decimal;const date=x=>new Date(`${x}T00:00:00.000Z`);const number=x=>Number(x.toString());function identifier(prefix){return`${prefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`}
async function tenantEntities(tenantId,checks){for(const[model,id]of checks){if(!id)continue;const exists=await prisma[model].findFirst({where:{id,tenantId}});if(!exists)throw new AppError('A selected finance record does not belong to this school',422,'INVALID_FINANCE_REFERENCE')}}
export const financeService={async overview(tenantId){const[categories,structures,invoices,payments,students]=await Promise.all([prisma.feeCategory.findMany({where:{tenantId,status:'ACTIVE'},orderBy:{name:'asc'}}),prisma.feeStructure.findMany({where:{tenantId,status:'ACTIVE'},include:{feeCategory:true,academicYear:true,academicPeriod:true,class:true},orderBy:{createdAt:'desc'}}),prisma.invoice.findMany({where:{tenantId},include:{student:true,items:{include:{allocations:{where:{payment:{status:'COMPLETED'}}}}}},orderBy:{createdAt:'desc'}}),prisma.payment.findMany({where:{tenantId},include:{student:true,receivedBy:{select:{firstName:true,lastName:true}},allocations:{include:{invoiceItem:{include:{invoice:true}}}}},orderBy:{createdAt:'desc'}}),prisma.student.findMany({where:{tenantId,deletedAt:null,status:'ACTIVE'},select:{id:true,studentNumber:true,firstName:true,lastName:true},orderBy:{firstName:'asc'}})]);const bills=invoices.map(invoice=>{const total=invoice.items.reduce((sum,item)=>sum+number(item.amount),0),paid=invoice.items.reduce((sum,item)=>sum+item.allocations.reduce((s,a)=>s+number(a.amount),0),0);return{...invoice,total,paid,balance:total-paid}});return{categories,structures,invoices:bills,payments,students,summary:{billed:bills.reduce((s,x)=>s+x.total,0),collected:payments.filter(x=>x.status==='COMPLETED').reduce((s,x)=>s+number(x.amount),0),outstanding:bills.reduce((s,x)=>s+x.balance,0)}}},
 async category(auth,data){try{const item=await prisma.feeCategory.create({data:{...data,tenantId:auth.tenantId}});await auditService.log({tenantId:auth.tenantId,userId:auth.userId,action:'CREATE',module:'FINANCE',entityType:'FeeCategory',entityId:item.id,newValue:data});return item}catch(e){if(e.code==='P2002')throw new AppError('Fee category code already exists',409,'FEE_CATEGORY_EXISTS');throw e}},
 async structure(auth,data){await tenantEntities(auth.tenantId,[['academicYear',data.academicYearId],['academicPeriod',data.academicPeriodId],['class',data.classId],['feeCategory',data.feeCategoryId]]);const item=await prisma.feeStructure.create({data:{...data,tenantId:auth.tenantId,academicPeriodId:data.academicPeriodId||null,classId:data.classId||null,amount:new D(data.amount)}});await auditService.log({tenantId:auth.tenantId,userId:auth.userId,action:'CREATE',module:'FINANCE',entityType:'FeeStructure',entityId:item.id,newValue:data});return item},
 async invoice(auth,data){await tenantEntities(auth.tenantId,[['student',data.studentId],['academicYear',data.academicYearId],['academicPeriod',data.academicPeriodId]]);const categoryIds=[...new Set(data.items.map(x=>x.feeCategoryId))],count=await prisma.feeCategory.count({where:{tenantId:auth.tenantId,id:{in:categoryIds}}});if(count!==categoryIds.length)throw new AppError('An invoice category does not belong to this school',422,'INVALID_FEE_CATEGORY');const item=await prisma.invoice.create({data:{tenantId:auth.tenantId,studentId:data.studentId,academicYearId:data.academicYearId,academicPeriodId:data.academicPeriodId||null,invoiceNumber:identifier('INV'),issueDate:date(data.issueDate),dueDate:date(data.dueDate),notes:data.notes,items:{create:data.items.map(x=>({...x,amount:new D(x.amount)}))}},include:{items:true,student:true}});await auditService.log({tenantId:auth.tenantId,userId:auth.userId,action:'CREATE',module:'FINANCE',entityType:'Invoice',entityId:item.id,newValue:{invoiceNumber:item.invoiceNumber,studentId:data.studentId}});return item},
 async payment(auth,data){
  const invoice=await prisma.invoice.findFirst({
   where:{id:data.invoiceId,tenantId:auth.tenantId,studentId:data.studentId,status:{notIn:['VOID','PAID']}},
   include:{items:{include:{allocations:{where:{payment:{status:'COMPLETED'}}}}}},
  });
  if(!invoice)throw new AppError('Open invoice not found for this student',404,'INVOICE_NOT_FOUND');
  const amount=new D(data.amount);let remaining=amount;
  const outstanding=invoice.items.reduce((sum,item)=>sum.plus(new D(item.amount).minus(item.allocations.reduce((paid,allocation)=>paid.plus(allocation.amount),new D(0)))),new D(0));
  if(amount.greaterThan(outstanding))throw new AppError('Payment cannot exceed the invoice balance',422,'PAYMENT_EXCEEDS_BALANCE');
  const allocations=[];
  for(const item of invoice.items){
   if(remaining.isZero())break;
   const paid=item.allocations.reduce((sum,allocation)=>sum.plus(allocation.amount),new D(0));
   const available=new D(item.amount).minus(paid);
   const allocated=remaining.lessThan(available)?remaining:available;
   if(allocated.greaterThan(0)){allocations.push({invoiceItemId:item.id,amount:allocated});remaining=remaining.minus(allocated)}
  }
  const payment=await prisma.$transaction(async tx=>{
   const saved=await tx.payment.create({data:{tenantId:auth.tenantId,studentId:data.studentId,receiptNumber:identifier('REC'),amount,paymentMethod:data.paymentMethod,paymentDate:date(data.paymentDate),reference:data.reference,notes:data.notes,receivedById:auth.userId,allocations:{create:allocations}}});
   await tx.invoice.update({where:{id:invoice.id},data:{status:amount.equals(outstanding)?'PAID':'PARTIALLY_PAID'}});
   return saved;
  });
  await auditService.log({tenantId:auth.tenantId,userId:auth.userId,action:'CREATE',module:'FINANCE',entityType:'Payment',entityId:payment.id,newValue:{receiptNumber:payment.receiptNumber,amount:data.amount,invoiceId:data.invoiceId}});
  return payment;
 }
};
