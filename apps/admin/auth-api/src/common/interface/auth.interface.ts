export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userAgent?: string;
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
    password: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
