import { z } from 'zod';
export { z };
import { loginSchema, registerSchema, verificationEmailSchema, resetPasswordSchema, vendorRegisterSchema, setupSuperadminSchema } from './validators/auth.validator';
import { verifyMfaSchema, verifyMfaForLoginSchema } from './validators/mfa.validator';
import { vendorProfileSchema, warehouseSchema, vendorDocumentsSchema, vendorBusinessInfoSchema } from './validators/vendor.validator';

export * from './validators/auth.validator';
export * from './validators/mfa.validator';
export * from './validators/vendor.validator';

export type loginType = z.infer<typeof loginSchema>;
export type registerType = z.infer<typeof registerSchema>;
export type vendorRegisterType = z.infer<typeof vendorRegisterSchema>;
export type verifyEmailType = z.infer<typeof verificationEmailSchema>;
export type resetPasswordType = z.infer<typeof resetPasswordSchema>;
export type verifyMFAType = z.infer<typeof verifyMfaSchema>;
export type mfaLoginType = z.infer<typeof verifyMfaForLoginSchema>;
export type setupSuperadminType = z.infer<typeof setupSuperadminSchema>;
export type vendorProfileType = z.infer<typeof vendorProfileSchema>;
export type warehouseType = z.infer<typeof warehouseSchema>;
export type vendorDocumentsType = z.infer<typeof vendorDocumentsSchema>;
export type vendorBusinessInfoType = z.infer<typeof vendorBusinessInfoSchema>;

export * from './types/api';

