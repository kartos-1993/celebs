export type BrandTier =
  | 'FIRST_PARTY'
  | 'GATED_GLOBAL'
  | 'REGISTERED_VENDOR'
  | 'OPEN_GENERIC';

export type BrandAuthStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  story?: string | null;
  countryOfOrigin?: string;
  tier: BrandTier;
  isGated: boolean;
  ownerVendorId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  tier: BrandTier;
  isGated: boolean;
  isAuthorized?: boolean;
}

export interface VendorBrandAuthorization {
  id: string;
  vendorId: string;
  brandId: string;
  brand?: BrandSummary;
  status: BrandAuthStatus;
  documentType: string;
  documentUrl: string;
  documentExpiryDate?: string | Date | null;
  reviewedBy?: string | null;
  reviewedAt?: string | Date | null;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BrandProtectionRule {
  id: string;
  brandId: string;
  pattern: string;
  matchField: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Backward-compatible DTO Aliases
export type BrandDto = Brand;
export type BrandSummaryDto = BrandSummary;
export type VendorBrandAuthorizationDto = VendorBrandAuthorization;
export type BrandProtectionRuleDto = BrandProtectionRule;
