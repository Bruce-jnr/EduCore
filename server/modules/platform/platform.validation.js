import { z } from 'zod';
const env = (body) => z.object({ body, query: z.any(), params: z.any() });
const startDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));
const endDate = z.iso.date().transform((value) => new Date(`${value}T23:59:59.999Z`));
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
  body: z.object({
    subscriptionPlan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
    subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED']),
    subscriptionStartedAt: z.union([startDate, z.null()]),
    subscriptionEndsAt: endDate,
  }).superRefine((value, context) => {
    if (value.subscriptionStatus === 'ACTIVE' && value.subscriptionPlan === 'TRIAL') context.addIssue({ code: 'custom', path: ['subscriptionPlan'], message: 'Choose a paid plan for an active subscription' });
    if (value.subscriptionStatus === 'ACTIVE' && !value.subscriptionStartedAt) context.addIssue({ code: 'custom', path: ['subscriptionStartedAt'], message: 'Set the paid subscription start date' });
    if (value.subscriptionStartedAt && value.subscriptionEndsAt <= value.subscriptionStartedAt) context.addIssue({ code: 'custom', path: ['subscriptionEndsAt'], message: 'End date must be after the start date' });
  }),
  query: z.any(),
  params: z.object({ id: z.string().min(1) }),
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
    defaultTrialDays: z.coerce.number().int().min(0).max(365),
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
