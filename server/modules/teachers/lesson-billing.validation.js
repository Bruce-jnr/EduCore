import {z} from 'zod';
export const lessonQuoteSchema=z.object({body:z.any(),params:z.any(),query:z.object({planId:z.string().min(1).max(191)}).strict()});
export const lessonPurchaseSchema=z.object({body:z.object({planId:z.string().min(1).max(191),idempotencyKey:z.string().uuid()}).strict(),params:z.any(),query:z.any()});
export const lessonVerifySchema=z.object({body:z.object({amount:z.number().positive().max(99999999).refine(value=>Math.abs(value*100-Math.round(value*100))<.00001,'Use at most two decimal places'),verified:z.literal(true),paymentMethod:z.enum(['CASH','MOBILE_MONEY','CARD','BANK_TRANSFER','CHEQUE','OTHER']),paymentReference:z.string().trim().min(3).max(120)}).strict(),params:z.object({id:z.string().min(1).max(191)}),query:z.any()});
export const lessonPaymentsListSchema=z.object({body:z.any(),params:z.any(),query:z.object({status:z.enum(['PENDING','PAID']).default('PENDING')}).strict()});
