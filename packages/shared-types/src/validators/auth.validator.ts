import { z } from 'zod';

export const emailSchema = z.string().trim().email().min(1).max(255);
export const passwordSchema = z
  .string()
  .trim()
  .min(8, 'Password must be at least 8 characters long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    'Password must include uppercase, lowercase, number, and special character'
  )
  .max(255);
export const verificationCodeSchema = z.string().trim().min(1).max(50);

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters long').max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Password does not match',
    path: ['confirmPassword'],
  });

export const vendorRegisterSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters long').max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    phoneNumber: z.string().trim().regex(/^9\d{9}$/, 'Phone number must be a valid 10-digit Nepalese mobile number starting with 9'),
    shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters').max(255),
    shopDescription: z.string().trim().max(1000).optional(),
    panNumber: z.string().trim().regex(/^\d{9}$/, 'PAN number must be exactly 9 digits'),
    citizenshipNumber: z.string().trim().min(5, 'Citizenship number must be provided'),
    panDocumentUrl: z.string().url('Invalid PAN document URL').optional(),
    citizenshipDocumentUrl: z.string().url('Invalid citizenship document URL').optional(),
    ownerPhotoUrl: z.string().url('Invalid owner photo URL').optional(),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Password does not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  userAgent: z.string().optional(),
});

export const verificationEmailSchema = z.object({
  code: verificationCodeSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});

export const setupSuperadminSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters long').max(255),
  email: emailSchema,
  password: passwordSchema,
  setupSecret: z.string().min(1, 'Setup secret is required'),
});
