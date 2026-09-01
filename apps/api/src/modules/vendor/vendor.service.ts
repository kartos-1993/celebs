import { vendorRegisterType } from '@celebs/shared-types';
import { BadRequestException, ErrorCode, logger, NotFoundException } from '@celebs/shared-utils';

import { AuthRepository, authRepository } from '../auth/auth.repository';
import { mediaRepository } from '../media/media.repository';

import { VendorRepository, vendorRepository } from './vendor.repository';

import { hashValue } from '@/common/utils/bcrypt';

export class VendorService {
  constructor(
    private vendorRepo: VendorRepository = vendorRepository,
    private authRepo: AuthRepository = authRepository,
  ) {}

  public async onboardVendor(registerData: vendorRegisterType) {
    const {
      name,
      email,
      password,
      shopName,
      shopDescription,
      phoneNumber,
      panNumber,
      citizenshipNumber,
      panDocumentUrl,
      citizenshipDocumentUrl,
      ownerPhotoUrl,
    } = registerData;

    const existingUser = await this.authRepo.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException(
        'User already exists with this email',
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      );
    }

    const existingShop = await this.vendorRepo.findByShopName(shopName);
    if (existingShop) {
      throw new BadRequestException('Shop name is already taken', ErrorCode.INVALID_REQUEST);
    }

    const existingPhone = await this.vendorRepo.findByPhoneNumber(phoneNumber);
    if (existingPhone) {
      throw new BadRequestException(
        'Phone number is already registered',
        ErrorCode.INVALID_REQUEST,
      );
    }

    const existingPan = await this.vendorRepo.findByPanNumber(panNumber);
    if (existingPan) {
      throw new BadRequestException('PAN number is already registered', ErrorCode.INVALID_REQUEST);
    }

    const existingCitizenship = await this.vendorRepo.findByCitizenshipNumber(citizenshipNumber);
    if (existingCitizenship) {
      throw new BadRequestException(
        'Citizenship number is already registered',
        ErrorCode.INVALID_REQUEST,
      );
    }

    const hashedPassword = await hashValue(password);

    const newUser = await this.vendorRepo.createVendorWithProfile(
      {
        name,
        email,
        password: hashedPassword,
        role: 'VENDOR',
      },
      {
        phoneNumber,
        shopName,
        shopDescription,
        panNumber,
        citizenshipNumber,
        panDocumentUrl,
        citizenshipDocumentUrl,
        ownerPhotoUrl,
        status: 'PENDING',
      },
    );

    await mediaRepository.ensureDefaultFolders(newUser.vendorProfileId);

    const user = newUser.user;
    logger.info(
      { email: user.email, id: user.id, shopName },
      'New vendor registered, profile pending approval',
    );

    return user;
  }

  public async getOnboardingStatus(userId: string) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    return profile;
  }

  public async updateProfile(
    userId: string,
    data: { shopDescription?: string; phoneNumber?: string; storeLogo?: string },
  ) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 1 ? 2 : profile.onboardingStep;

    return await this.vendorRepo.updateProfile(userId, {
      shopDescription: data.shopDescription,
      phoneNumber: data.phoneNumber || profile.phoneNumber,
      storeLogo: data.storeLogo,
      onboardingStep: nextStep,
    });
  }

  public async updateWarehouse(
    userId: string,
    data: {
      label: string;
      contactName: string;
      contactPhone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      district: string;
      province: string;
      postalCode?: string;
    },
  ) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    await this.vendorRepo.upsertWarehouse(profile.id, {
      label: data.label,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      district: data.district,
      province: data.province,
      postalCode: data.postalCode,
      isBusinessAddress: true,
    });

    const nextStep = profile.onboardingStep === 2 ? 3 : profile.onboardingStep;

    return await this.vendorRepo.updateProfile(userId, {
      onboardingStep: nextStep,
    });
  }

  public async updateDocuments(
    userId: string,
    data: {
      panDocumentUrl?: string;
      citizenshipDocumentUrl?: string;
      vatDocumentUrl?: string;
      businessRegDocumentUrl?: string;
      ownerPhotoUrl?: string;
    },
  ) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 3 ? 4 : profile.onboardingStep;

    return await this.vendorRepo.updateProfile(userId, {
      panDocumentUrl: data.panDocumentUrl,
      citizenshipDocumentUrl: data.citizenshipDocumentUrl,
      vatDocumentUrl: data.vatDocumentUrl,
      businessRegDocumentUrl: data.businessRegDocumentUrl,
      ownerPhotoUrl: data.ownerPhotoUrl,
      onboardingStep: nextStep,
    });
  }

  public async updateBusinessInfo(
    userId: string,
    data: {
      businessName: string;
      businessRegNumber: string;
      businessPhoneNumber: string;
    },
  ) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 4 ? 5 : profile.onboardingStep;

    return await this.vendorRepo.updateProfile(userId, {
      businessName: data.businessName,
      businessRegNumber: data.businessRegNumber,
      businessPhoneNumber: data.businessPhoneNumber,
      onboardingStep: nextStep,
    });
  }

  public async submitForReview(userId: string) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    if (profile.onboardingStep < 5) {
      throw new BadRequestException(
        'Complete all onboarding steps before submitting for review',
        ErrorCode.INVALID_REQUEST,
      );
    }

    return await this.vendorRepo.updateProfile(userId, {
      status: 'UNDER_REVIEW',
    });
  }

  public async resubmitForReview(userId: string) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    if (profile.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only rejected vendors can resubmit for review',
        ErrorCode.INVALID_REQUEST,
      );
    }

    return await this.vendorRepo.updateProfile(userId, {
      status: 'UNDER_REVIEW',
      rejectionReason: null,
    });
  }

  public async toggleHolidayMode(userId: string) {
    const profile = await this.vendorRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return await this.vendorRepo.updateProfile(userId, {
      holidayMode: !profile.holidayMode,
    });
  }
}

export const vendorService = new VendorService();
