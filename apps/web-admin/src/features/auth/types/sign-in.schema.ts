import { z } from 'zod';

export const signInFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' })
    .email({ message: 'Invalid email address' }),
  password: z.string().min(1, {
    message: 'Please enter your password',
  }),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;
