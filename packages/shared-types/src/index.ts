import { z } from 'zod';
export { z };
import {
  loginSchema,
  registerSchema,
  verificationEmailSchema,
  resetPasswordSchema,
  vendorRegisterSchema,
  setupSuperadminSchema,
  resendVerificationSchema,
} from './validators/auth.validator';
import { verifyMfaSchema, verifyMfaForLoginSchema } from './validators/mfa.validator';
import {
  vendorProfileSchema,
  warehouseSchema,
  vendorDocumentsSchema,
  vendorBusinessInfoSchema,
  createStaffSchema,
} from './validators/vendor.validator';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  updateProductStockSchema,
  productReviewActionSchema,
  productFilterSchema,
} from './validators/product.validator';

export * from './validators/auth.validator';
export * from './validators/mfa.validator';
export * from './validators/vendor.validator';
export * from './validators/product.validator';
export * from './validators/cart.validator';
export * from './validators/order.validator';
export * from './validators/category.validator';
export * from './validators/combo.validator';
export * from './validators/campaign.validator';
export * from './validators/logistics.validator';

export type loginType = z.infer<typeof loginSchema>;
export type registerType = z.infer<typeof registerSchema>;
export type vendorRegisterType = z.infer<typeof vendorRegisterSchema>;
export type verifyEmailType = z.infer<typeof verificationEmailSchema>;
export type resetPasswordType = z.infer<typeof resetPasswordSchema>;
export type verifyMFAType = z.infer<typeof verifyMfaSchema>;
export type mfaLoginType = z.infer<typeof verifyMfaForLoginSchema>;
export type setupSuperadminType = z.infer<typeof setupSuperadminSchema>;
export type resendVerificationType = z.infer<typeof resendVerificationSchema>;
export type vendorProfileType = z.infer<typeof vendorProfileSchema>;
export type warehouseType = z.infer<typeof warehouseSchema>;
export type vendorDocumentsType = z.infer<typeof vendorDocumentsSchema>;
export type vendorBusinessInfoType = z.infer<typeof vendorBusinessInfoSchema>;

export type CreateProductType = z.input<typeof createProductSchema>;
export type UpdateProductType = z.input<typeof updateProductSchema>;
export type ProductFilterType = z.input<typeof productFilterSchema>;
export type ProductType = z.infer<typeof createProductSchema>;
export type ProductReviewActionType = z.infer<typeof productReviewActionSchema>;
export type CreateStaffType = z.infer<typeof createStaffSchema>;

export * from './types/api';
export * from './types/cart';
export * from './types/category';
export * from './types/marketing';
export * from './types/user';
