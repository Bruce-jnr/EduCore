import { z } from 'zod';
const env = (body) => z.object({ body, query: z.any(), params: z.any() });
export const platformLoginSchema = env(
  z.object({
    email: z.email().transform((x) => x.toLowerCase()),
    password: z.string().min(8).max(128),
  }),
);
export const createSchoolSchema = env(
  z.object({
    name: z.string().trim().min(2).max(150),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    schoolCode: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((x) => x.toUpperCase()),
    schoolType: z.literal('BASIC'),
    email: z.union([z.email(), z.literal('')]).optional(),
    phone: z.string().trim().max(30).optional(),
    country: z.string().trim().min(2).max(80).default('Ghana'),
    currency: z.string().trim().length(3).default('GHS'),
    timezone: z.string().trim().min(3).max(80).default('Africa/Accra'),
    adminFirstName: z.string().trim().min(1).max(80),
    adminLastName: z.string().trim().min(1).max(80),
    adminEmail: z.email().transform((x) => x.toLowerCase()),
    adminPassword: z.string().min(8).max(128),
  }),
);
export const schoolStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  query: z.any(),
  params: z.object({ id: z.string().min(1) }),
});
export const subscriptionSchema = z.object({
 body: z.object({ subscriptionPlan:z.enum(['FREEMIUM','TRIAL','STARTER','PROFESSIONAL','ENTERPRISE']), subscriptionStatus:z.enum(['TRIAL','ACTIVE','PAST_DUE','EXPIRED','CANCELLED']), billingCycle:z.enum(['MONTHLY','ANNUAL']).default('MONTHLY'),quoteOnly:z.boolean().optional(), enterpriseStudentLimit:z.number().int().positive().max(2147483647).optional(), enterpriseStaffLimit:z.number().int().positive().max(2147483647).optional(), enterprisePrice:z.number().positive().max(9999999999).refine(value=>Math.abs(value*100-Math.round(value*100))<0.00001,'Use at most two decimal places').optional() }).strict(),
 params:z.object({id:z.string().min(1)}),query:z.any(),
});
export const subscriptionPaymentSchema = z.object({
 body:z.object({ plan:z.enum(['STARTER','PROFESSIONAL','ENTERPRISE']),billingCycle:z.enum(['MONTHLY','ANNUAL']),amount:z.number().positive().max(9999999999).refine(value=>Math.abs(value*100-Math.round(value*100))<0.00001,'Use at most two decimal places'),paymentMethod:z.enum(['CASH','MOBILE_MONEY','BANK_TRANSFER','CHEQUE','CARD','OTHER']),paymentReference:z.string().trim().min(3).max(120),idempotencyKey:z.string().uuid(),verified:z.literal(true) }).strict(),
 params:z.object({id:z.string().min(1)}),query:z.any(),
});
export const platformSettingsSchema = env(
  z.object({
    platformName: z.string().trim().min(2).max(100),
    supportEmail: z.union([z.email(), z.literal('')]).optional(),
    supportPhone: z.string().trim().max(30).optional(),
    appUrl: z.union([z.url(), z.literal('')]).optional(),
    defaultCountry: z.string().trim().min(2).max(80),
    defaultCurrency: z
      .string()
      .trim()
      .length(3)
      .transform((x) => x.toUpperCase()),
    defaultTimezone: z.string().trim().min(3).max(80),
    defaultTrialDays: z.coerce.number().int().min(14).max(14),
    registrationEnabled: z.boolean(),
    maintenanceMode: z.boolean(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
);
export const auditQuerySchema = z.object({
  body: z.any(),
  params: z.any(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).default(''),
    module: z.string().trim().max(50).optional(),
    action: z.string().trim().max(80).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  }),
});
