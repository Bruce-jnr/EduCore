export const PAID_TRIAL_DAYS = 14;
export const SCHOOL_PLANS = {
  FREEMIUM: { name:'Freemium', monthly:0, annual:0, students:50, staff:5, rank:0 },
  STARTER: { name:'Starter', monthly:400, annual:4000, students:500, staff:30, rank:1 },
  PROFESSIONAL: { name:'Professional', monthly:750, annual:7500, students:1000, staff:100, rank:2 },
  ENTERPRISE: { name:'Enterprise', monthly:null, annual:null, students:null, staff:null, rank:3 },
};
export function planFor(school) { return SCHOOL_PLANS[school.subscriptionPlan === 'TRIAL' ? 'PROFESSIONAL' : school.subscriptionPlan] || null; }
export function schoolLimits(school) { const plan=planFor(school); return plan ? { students:school.subscriptionPlan==='ENTERPRISE'?(school.enterpriseStudentLimit??null):plan.students,staff:school.subscriptionPlan==='ENTERPRISE'?(school.enterpriseStaffLimit??null):plan.staff } : null; }
export function planPrice(plan,cycle) { const item=SCHOOL_PLANS[plan]; return item ? item[cycle==='ANNUAL'?'annual':'monthly'] : null; }
export function money(amount) { return amount===null?'Custom':`GH\u20b5${Number(amount).toLocaleString('en-GH')}`; }
export function billingPeriodEnd(start,cycle) {
  const end=new Date(start);const day=end.getUTCDate();end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth()+(cycle==='ANNUAL'?12:1));
  const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));return end;
}
