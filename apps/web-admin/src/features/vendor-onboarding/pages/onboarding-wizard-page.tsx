import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '@/context/auth-provider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import { Button } from '@celebs/shared-ui/components/button';
import {
  vendorProfileSchema,
  warehouseSchema,
  vendorDocumentsSchema,
  vendorBusinessInfoSchema,
} from '@celebs/shared-types';
import {
  updateVendorProfile,
  updateVendorWarehouse,
  updateVendorDocuments,
  updateVendorBusinessInfo,
  submitVendorForReview,
} from '../api';
import { PendingReviewScreen } from '../components/pending-review-screen';
import { RejectionScreen } from '../components/rejection-screen';

export default function OnboardingWizard() {
  const { user, refetch } = useAuthContext();
  // onboardingStep is only used inside the wizard form — not for routing.
  // status is the single source of truth for what screen to show.
  const vendorStatus = user?.vendorProfile?.status;
  const initialStep = user?.vendorProfile?.onboardingStep ?? 1;
  const [step, setStep] = useState(initialStep);

  // Step 1: Profile Form
  const profileForm = useForm({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      shopDescription: user?.vendorProfile?.shopDescription || '',
      phoneNumber: user?.vendorProfile?.phoneNumber || '',
      storeLogo: user?.vendorProfile?.storeLogo || '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: updateVendorProfile,
    onSuccess: () => {
      refetch();
      setStep(2);
    },
  });

  // Step 2: Warehouse Form
  const warehouseForm = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      label: 'Main Warehouse',
      contactName: user?.name || '',
      contactPhone: user?.vendorProfile?.phoneNumber || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      province: '',
      postalCode: '',
    },
  });

  const warehouseMutation = useMutation({
    mutationFn: updateVendorWarehouse,
    onSuccess: () => {
      refetch();
      setStep(3);
    },
  });

  // Step 3: Documents Form
  const documentsForm = useForm({
    resolver: zodResolver(vendorDocumentsSchema),
    defaultValues: {
      panDocumentUrl: 'http://example.com/pan.png',
      citizenshipDocumentUrl: 'http://example.com/citizen.png',
      vatDocumentUrl: '',
      businessRegDocumentUrl: '',
      ownerPhotoUrl: '',
    },
  });

  const documentsMutation = useMutation({
    mutationFn: updateVendorDocuments,
    onSuccess: () => {
      refetch();
      setStep(4);
    },
  });

  // Step 4: Business Info Form
  const businessForm = useForm({
    resolver: zodResolver(vendorBusinessInfoSchema),
    defaultValues: {
      businessName: '',
      businessRegNumber: '',
      businessPhoneNumber: user?.vendorProfile?.phoneNumber || '',
    },
  });

  const businessMutation = useMutation({
    mutationFn: updateVendorBusinessInfo,
    onSuccess: () => {
      refetch();
      setStep(5);
    },
  });

  // Step 5: Submit Mutation
  const submitMutation = useMutation({
    mutationFn: submitVendorForReview,
    onSuccess: () => {
      // Refetch updates vendorProfile.status to UNDER_REVIEW;
      // AuthContext re-renders → wizard picks up new status.
      refetch();
    },
  });

  // ── Status-based screen routing ─────────────────────────────────────────
  // Status is the single source of truth. onboardingStep is only used inside
  // the step forms below.
  if (vendorStatus === 'UNDER_REVIEW') {
    return <PendingReviewScreen vendorName={user?.name} />;
  }

  if (vendorStatus === 'REJECTED') {
    return <RejectionScreen rejectionReason={user?.vendorProfile?.rejectionReason} />;
  }

  const progressPercentage = (step / 5) * 100;

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Seller Onboarding — Step {step} of 5</h2>
          <span className="text-sm font-medium">{progressPercentage}% Complete</span>
        </div>
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border shadow-sm">
        {step === 1 && (
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Store Profile Information</h3>
              <FormField
                control={profileForm.control}
                name="shopDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe your store and products" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="98XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="storeLogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="http://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={profileMutation.isPending}>
                Save and Continue
              </Button>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...warehouseForm}>
            <form
              onSubmit={warehouseForm.handleSubmit((values) => warehouseMutation.mutate(values))}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Warehouse / Dispatch Address</h3>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={warehouseForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Warehouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={warehouseForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="98XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={warehouseForm.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={warehouseForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input placeholder="District" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={warehouseForm.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Input placeholder="Province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={warehouseMutation.isPending}>
                Save and Continue
              </Button>
            </form>
          </Form>
        )}

        {step === 3 && (
          <Form {...documentsForm}>
            <form
              onSubmit={documentsForm.handleSubmit((values) => documentsMutation.mutate(values))}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Upload KYC Documents</h3>
              <FormField
                control={documentsForm.control}
                name="panDocumentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Certificate Link</FormLabel>
                    <FormControl>
                      <Input placeholder="http://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={documentsForm.control}
                name="citizenshipDocumentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Citizenship Document Link</FormLabel>
                    <FormControl>
                      <Input placeholder="http://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={documentsMutation.isPending}>
                Save and Continue
              </Button>
            </form>
          </Form>
        )}

        {step === 4 && (
          <Form {...businessForm}>
            <form
              onSubmit={businessForm.handleSubmit((values) => businessMutation.mutate(values))}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">Legal Business Details</h3>
              <FormField
                control={businessForm.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter registered business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="businessRegNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Reg No. e.g. 12345/079/080" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={businessForm.control}
                name="businessPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="98XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={businessMutation.isPending}>
                Save and Continue
              </Button>
            </form>
          </Form>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Submit Profile</h3>
            <p className="text-sm text-muted-foreground">
              Please confirm that all business documents and addresses are correct. After
              submitting, your profile will be reviewed by platform administrators for approval.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              Submit Profile for Review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
