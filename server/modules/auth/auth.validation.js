import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    schoolSlug: z.string().trim().min(2).max(80),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
  }),
  query: z.any(),
  params: z.any(),
});
