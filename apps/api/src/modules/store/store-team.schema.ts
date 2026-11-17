import { z } from 'zod';
import { email } from '../../shared/schemas.js';

export const addStaffSchema = z.strictObject({ email });

export type AddStaffInput = z.output<typeof addStaffSchema>;
