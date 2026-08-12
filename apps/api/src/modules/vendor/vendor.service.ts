import { BadRequestException, ErrorCode, NotFoundException } from '@celebs/shared-utils';

import prisma from '@/db';

export class VendorService {
  public async getOnboardingStatus(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
      include: { warehouses: true },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    return profile;
  }

  public async updateProfile(
    userId: string,
    data: { shopDescription?: string; phoneNumber?: string; storeLogo?: string },
  ) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 1 ? 2 : profile.onboardingStep;

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        shopDescription: data.shopDescription,
        phoneNumber: data.phoneNumber || profile.phoneNumber,
        storeLogo: data.storeLogo,
        onboardingStep: nextStep,
      },
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
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Create or update the primary warehouse
    await prisma.warehouse.upsert({
      where: {
        id: profile.id, // We can reuse profile ID or query by vendorProfileId
      },
      create: {
        vendorProfileId: profile.id,
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
      },
      update: {
        label: data.label,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        district: data.district,
        province: data.province,
        postalCode: data.postalCode,
      },
    });

    const nextStep = profile.onboardingStep === 2 ? 3 : profile.onboardingStep;

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        onboardingStep: nextStep,
      },
      include: {
        warehouses: true,
      },
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
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 3 ? 4 : profile.onboardingStep;

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        panDocumentUrl: data.panDocumentUrl,
        citizenshipDocumentUrl: data.citizenshipDocumentUrl,
        vatDocumentUrl: data.vatDocumentUrl,
        businessRegDocumentUrl: data.businessRegDocumentUrl,
        ownerPhotoUrl: data.ownerPhotoUrl,
        onboardingStep: nextStep,
      },
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
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const nextStep = profile.onboardingStep === 4 ? 5 : profile.onboardingStep;

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        businessName: data.businessName,
        businessRegNumber: data.businessRegNumber,
        businessPhoneNumber: data.businessPhoneNumber,
        onboardingStep: nextStep,
      },
    });
  }

  public async submitForReview(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    if (profile.onboardingStep < 5) {
      throw new BadRequestException(
        'Complete all onboarding steps before submitting for review',
        ErrorCode.INVALID_REQUEST,
      );
    }

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        status: 'UNDER_REVIEW',
      },
    });
  }

  public async resubmitForReview(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }
    if (profile.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only rejected vendors can resubmit for review',
        ErrorCode.INVALID_REQUEST,
      );
    }

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        status: 'UNDER_REVIEW',
        rejectionReason: null,
      },
    });
  }

  public async toggleHolidayMode(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return await prisma.vendorProfile.update({
      where: { userId },
      data: {
        holidayMode: !profile.holidayMode,
      },
    });
  }
}
