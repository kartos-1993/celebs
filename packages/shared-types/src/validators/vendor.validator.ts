import { z } from 'zod';

export const vendorProfileSchema = z.object({
  shopDescription: z
    .string()
    .trim()
    .min(10, 'Please enter a shop description of at least 10 characters')
    .max(1000, 'Shop description cannot exceed 1000 characters'),
  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^9\d{9}$/,
      'Please enter a valid 10-digit mobile number starting with 9 (e.g. 98XXXXXXXX)',
    ),
  storeLogo: z.string().url('Invalid store logo URL').optional().or(z.literal('')),
});

export const warehouseSchema = z.object({
  label: z.string().trim().min(2, 'Warehouse label must be at least 2 characters').max(255),
  contactName: z.string().trim().min(3, 'Contact person name must be at least 3 characters').max(255),
  contactPhone: z
    .string()
    .trim()
    .regex(/^9\d{9}$/, 'Contact phone must be a valid 10-digit mobile number starting with 9'),
  addressLine1: z.string().trim().min(3, 'Address line 1 is required').max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2, 'City is required').max(100),
  district: z.string().trim().min(2, 'District is required').max(100),
  province: z.string().trim().min(2, 'Province is required').max(100),
  postalCode: z.string().trim().max(20).optional(),
});

export const vendorDocumentsSchema = z.object({
  panDocumentUrl: z
    .string({ required_error: 'PAN Certificate document is required for KYC verification' })
    .trim()
    .min(1, 'PAN Certificate document is required for KYC verification')
    .url('Invalid PAN document URL'),
  citizenshipDocumentUrl: z
    .string({ required_error: 'Citizenship document photo is required for KYC verification' })
    .trim()
    .min(1, 'Citizenship document photo is required for KYC verification')
    .url('Invalid citizenship document URL'),
  vatDocumentUrl: z.string().url('Invalid VAT document URL').optional().or(z.literal('')),
  businessRegDocumentUrl: z
    .string()
    .url('Invalid business registration URL')
    .optional()
    .or(z.literal('')),
  ownerPhotoUrl: z.string().url('Invalid owner photo URL').optional().or(z.literal('')),
});

export const vendorBusinessInfoSchema = z.object({
  businessName: z.string().trim().min(3, 'Registered business name is required').max(255),
  businessRegNumber: z.string().trim().min(3, 'Business registration / PAN number is required').max(100),
  businessPhoneNumber: z
    .string()
    .trim()
    .regex(/^9\d{9}$/, 'Business phone must be a valid 10-digit mobile number starting with 9'),
});

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters long').max(255),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().trim().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z
      .string()
      .trim()
      .min(8, 'Password confirmation must be at least 8 characters long'),
    permissions: z.array(z.string()).optional(),
    vendorId: z.string().optional(),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Password does not match',
    path: ['confirmPassword'],
  });
