export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userAgent?: string;
}

export interface VendorRegisterDto extends RegisterDto {
  shopName: string;
  shopDescription?: string;
  phoneNumber: string;
  panNumber: string;
  citizenshipNumber: string;
  panDocumentUrl?: string;
  citizenshipDocumentUrl?: string;
  ownerPhotoUrl?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  userAgent?: string;
}

export interface resetPasswordDto {
  password: string;
  verificationCode: string;
}

// Interface for email verification response that includes authentication tokens
export interface VerifyEmailResponse {
  user: {
    id: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SetupSuperadminDto {
  name: string;
  email: string;
  password: string;
  setupSecret: string;
}
