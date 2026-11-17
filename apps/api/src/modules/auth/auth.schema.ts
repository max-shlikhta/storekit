import { z } from 'zod';
import { email } from '../../shared/schemas.js';

export const password = z.string().min(10, 'Use at least 10 characters').max(200);

const code = z.string().trim().min(6).max(20);

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1).max(200),
});

export const codeSchema = z.strictObject({ code });

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});

export const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(255).nullable(),
  })
  .partial();
