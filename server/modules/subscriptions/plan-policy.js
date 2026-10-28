import { AppError } from '../../errors/app-error.js';
import { planFor,schoolLimits } from '../../../shared/pricing.js';
export function assertSubscription(school,now=new Date()) {
  if (school.isActive===false) throw new AppError('School is inactive or unavailable.',403,'TENANT_INACTIVE');
  if (!planFor(school)) throw new AppError('School plan is not configured.',403,'PLAN_UNAVAILABLE');
  if (['EXPIRED','CANCELLED','PAST_DUE'].includes(school.subscriptionStatus) || (school.subscriptionEndsAt && new Date(school.subscriptionEndsAt)<=now)) throw new AppError('Your school subscription has expired or payment is due. Contact the platform administrator.',403,'SUBSCRIPTION_EXPIRED');
  if (school.subscriptionPlan!=='FREEMIUM' && !school.subscriptionEndsAt) throw new AppError('A paid plan needs a valid access period.',403,'SUBSCRIPTION_PERIOD_REQUIRED');
}
export function assertPlanFeature(school,feature) {
  const minimum={finance:1,reportCards:1,advancedReports:2,schoolLessons:2,teacherPortal:2}[feature];
  if (minimum===undefined || !planFor(school) || planFor(school).rank<minimum) throw new AppError('This feature requires a higher school plan. View pricing or contact your platform administrator.',403,'PLAN_UPGRADE_REQUIRED');
}
export async function lockSchool(tx,tenantId) {
  await tx.$queryRaw`SELECT id FROM Tenant WHERE id = ${tenantId} FOR UPDATE`;
  const school=await tx.tenant.findUnique({where:{id:tenantId}});
  if (!school) throw new AppError('School not found',404,'TENANT_NOT_FOUND');
  return school;
}
export async function assertSchoolCapacity(tx,tenantId,model,additional=1) {
  const school=await lockSchool(tx,tenantId);assertSubscription(school);
  const limits=schoolLimits(school);const limit=limits[model==='student'?'students':'staff'];
  const count=await tx[model].count({where:{tenantId,deletedAt:null}});
  if (limit!==null && count+additional>limit) throw new AppError(`Your ${planFor(school).name} plan allows ${limit} ${model==='student'?'students':'staff'}. Upgrade before adding more.`,403,'PLAN_CAPACITY_REACHED');
  return school;
}
export async function assertPlanFits(tx,school) {
  const [students,staff]=await Promise.all([tx.student.count({where:{tenantId:school.id,deletedAt:null}}),tx.staff.count({where:{tenantId:school.id,deletedAt:null}})]);
  const limits=schoolLimits(school);
  if (!limits || (limits.students!==null&&students>limits.students)||(limits.staff!==null&&staff>limits.staff)) throw new AppError('Current student or staff usage exceeds the requested plan. Choose a larger plan before changing access.',409,'PLAN_BELOW_USAGE');
}
