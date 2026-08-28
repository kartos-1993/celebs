import type {
  vendorBusinessInfoType,
  vendorDocumentsType,
  VendorProfileData,
  vendorProfileType,
  WarehouseData,
  warehouseType,
} from '@celebs/shared-types';

export interface WizardStepConfig {
  num: number;
  label: string;
}

export interface StepBaseProps {
  onComplete: () => void;
  onBack?: () => void;
}

export interface ProfileStepProps extends StepBaseProps {
  defaultValues: vendorProfileType;
}

export interface WarehouseStepProps extends StepBaseProps {
  defaultValues: warehouseType;
}

export interface DocumentsStepProps extends StepBaseProps {
  defaultValues: vendorDocumentsType;
}

export interface BusinessInfoStepProps extends StepBaseProps {
  defaultValues: vendorBusinessInfoType;
}

export interface ReviewSubmitStepProps {
  onBack: () => void;
  isRejectedMode: boolean;
  profile?: VendorProfileData;
  userEmail?: string;
  onSuccess: () => void;
}

export type VendorProfileFormValues = vendorProfileType;
export type WarehouseFormValues = warehouseType;
export type VendorDocumentsFormValues = vendorDocumentsType;
export type VendorBusinessInfoFormValues = vendorBusinessInfoType;

export type {
  vendorBusinessInfoType,
  vendorDocumentsType,
  VendorProfileData,
  vendorProfileType,
  WarehouseData,
  warehouseType,
};
