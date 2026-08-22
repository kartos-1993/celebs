import { useEffect,useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Send } from 'lucide-react';

import {
  vendorBusinessInfoSchema,
  vendorDocumentsSchema,
  vendorProfileSchema,
  warehouseSchema,
} from '@celebs/shared-types';
import { Alert, AlertDescription,AlertTitle } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import {
  resubmitForReview,
  submitVendorForReview,
  updateVendorBusinessInfo,
  updateVendorDocuments,
  updateVendorProfile,
  updateVendorWarehouse,
} from '../api';
import { DocumentUploader } from '../components/document-uploader';
import { PendingReviewScreen } from '../components/pending-review-screen';
import { RejectionScreen } from '../components/rejection-screen';

import { useAuthContext } from '@/context/auth-provider';

export default function OnboardingWizard() {
  const { user, refetch } = useAuthContext();
  const vendorStatus = user?.vendorProfile?.status;
  const rejectionReason = user?.vendorProfile?.rejectionReason;
  const initialStep = user?.vendorProfile?.onboardingStep ?? 1;

  const [step, setStep] = useState<number>(initialStep > 5 ? 5 : initialStep);
  const [isEditing, setIsEditing] = useState<boolean>(false);

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
      label: user?.vendorProfile?.warehouses?.[0]?.label || 'Main Warehouse',
      contactName: user?.vendorProfile?.warehouses?.[0]?.contactName || user?.name || '',
      contactPhone:
        user?.vendorProfile?.warehouses?.[0]?.contactPhone ||
        user?.vendorProfile?.phoneNumber ||
        '',
      addressLine1: user?.vendorProfile?.warehouses?.[0]?.addressLine1 || '',
      addressLine2: user?.vendorProfile?.warehouses?.[0]?.addressLine2 || '',
      city: user?.vendorProfile?.warehouses?.[0]?.city || '',
      district: user?.vendorProfile?.warehouses?.[0]?.district || '',
      province: user?.vendorProfile?.warehouses?.[0]?.province || '',
      postalCode: user?.vendorProfile?.warehouses?.[0]?.postalCode || '',
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
      panDocumentUrl: user?.vendorProfile?.panDocumentUrl || '',
      citizenshipDocumentUrl: user?.vendorProfile?.citizenshipDocumentUrl || '',
      vatDocumentUrl: user?.vendorProfile?.vatDocumentUrl || '',
      businessRegDocumentUrl: user?.vendorProfile?.businessRegDocumentUrl || '',
      ownerPhotoUrl: user?.vendorProfile?.ownerPhotoUrl || '',
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
      businessName: user?.vendorProfile?.businessName || '',
      businessRegNumber: user?.vendorProfile?.businessRegNumber || '',
      businessPhoneNumber:
        user?.vendorProfile?.businessPhoneNumber || user?.vendorProfile?.phoneNumber || '',
    },
  });

  const businessMutation = useMutation({
    mutationFn: updateVendorBusinessInfo,
    onSuccess: () => {
      refetch();
      setStep(5);
    },
  });

  // Step 5: Initial Submit Mutation
  const submitMutation = useMutation({
    mutationFn: submitVendorForReview,
    onSuccess: () => {
      refetch();
    },
  });

  // Step 5: Resubmit Mutation for REJECTED vendors
  const resubmitMutation = useMutation({
    mutationFn: resubmitForReview,
    onSuccess: () => {
      refetch();
    },
  });

  const { reset: resetProfile } = profileForm;
  const { reset: resetWarehouse } = warehouseForm;
  const { reset: resetDocuments } = documentsForm;
  const { reset: resetBusiness } = businessForm;

  // Automatically reset form fields whenever user profile data resolves or updates
  useEffect(() => {
    if (user?.vendorProfile) {
      resetProfile({
        shopDescription: user.vendorProfile.shopDescription || '',
        phoneNumber: user.vendorProfile.phoneNumber || '',
        storeLogo: user.vendorProfile.storeLogo || '',
      });

      const primaryWarehouse = user.vendorProfile.warehouses?.[0];
      resetWarehouse({
        label: primaryWarehouse?.label || 'Main Warehouse',
        contactName: primaryWarehouse?.contactName || user.name || '',
        contactPhone: primaryWarehouse?.contactPhone || user.vendorProfile.phoneNumber || '',
        addressLine1: primaryWarehouse?.addressLine1 || '',
        addressLine2: primaryWarehouse?.addressLine2 || '',
        city: primaryWarehouse?.city || '',
        district: primaryWarehouse?.district || '',
        province: primaryWarehouse?.province || '',
        postalCode: primaryWarehouse?.postalCode || '',
      });

      resetDocuments({
        panDocumentUrl: user.vendorProfile.panDocumentUrl || '',
        citizenshipDocumentUrl: user.vendorProfile.citizenshipDocumentUrl || '',
        vatDocumentUrl: user.vendorProfile.vatDocumentUrl || '',
        businessRegDocumentUrl: user.vendorProfile.businessRegDocumentUrl || '',
        ownerPhotoUrl: user.vendorProfile.ownerPhotoUrl || '',
      });

      resetBusiness({
        businessName: user.vendorProfile.businessName || '',
        businessRegNumber: user.vendorProfile.businessRegNumber || '',
        businessPhoneNumber:
          user.vendorProfile.businessPhoneNumber || user.vendorProfile.phoneNumber || '',
      });
    }
  }, [user, resetProfile, resetWarehouse, resetDocuments, resetBusiness]);

  // ── Status-based screen routing ─────────────────────────────────────────
  if (vendorStatus === 'APPROVED') {
    return <Navigate to="/" replace />;
  }

  if (vendorStatus === 'UNDER_REVIEW') {
    return <PendingReviewScreen vendorName={user?.name} />;
  }

  // If application was rejected and vendor hasn't clicked "Edit Application" yet
  if (vendorStatus === 'REJECTED' && !isEditing) {
    return <RejectionScreen rejectionReason={rejectionReason} onEdit={() => setIsEditing(true)} />;
  }

  const isRejectedMode = vendorStatus === 'REJECTED';
  const progressPercentage = (step / 5) * 100;

  const stepsList = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Warehouse' },
    { num: 3, label: 'Documents' },
    { num: 4, label: 'Business Info' },
    { num: 5, label: 'Submit' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Sticky Rejection Reason Banner when editing a rejected application */}
      {isRejectedMode && (
        <Alert className="bg-destructive/10 border-destructive/40 text-destructive mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="ml-2">
            <AlertTitle className="font-bold text-sm">
              Moderation Feedback — Revision Required
            </AlertTitle>
            <AlertDescription className="text-xs text-foreground mt-1">
              {rejectionReason ||
                'Please review your application steps below and correct any flagged details.'}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Progress & Step Navigation Header */}
      <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Seller Setup Wizard
              {isRejectedMode && (
                <span className="ml-2 text-xs bg-warning/10 text-warning font-semibold px-2 py-0.5 rounded border border-warning/30">
                  Editing Revision
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Step {step} of 5 — {stepsList.find((s) => s.num === step)?.label}
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{Math.round(progressPercentage)}%</span>
        </div>

        {/* Step Indicator Tabs (Always clickable in rejection mode or completed steps) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t sm:grid-cols-3 md:grid-cols-5">
          {stepsList.map((s) => {
            const isCurrent = step === s.num;
            const isCompleted = s.num < initialStep || isRejectedMode;
            const canClick = isCompleted || isCurrent || isRejectedMode;

            return (
              <Button
                key={s.num}
                type="button"
                variant="ghost"
                onClick={() => canClick && setStep(s.num)}
                disabled={!canClick}
                className={`w-full h-auto flex-col p-2 rounded-md text-xs font-medium ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : canClick
                      ? 'bg-muted/50 hover:bg-muted text-foreground cursor-pointer'
                      : 'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  {s.num < step ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <span>{s.num}.</span>
                  )}
                  <span className="truncate">{s.label}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        {/* STEP 1: STORE PROFILE */}
        {step === 1 && (
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold">Step 1: Store Profile Details</h3>
                <p className="text-xs text-muted-foreground">
                  Enter basic information about your store branding and customer support contact.
                </p>
              </div>

              <FormField
                control={profileForm.control}
                name="shopDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Shop Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Describe your brand, key categories, and store identity (min 10 characters)..."
                        {...field}
                      />
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
                    <FormLabel className="font-semibold">
                      Store Contact Phone <span className="text-destructive">*</span>
                    </FormLabel>
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
                    <DocumentUploader
                      label="Store Logo Image (Optional)"
                      description="Upload your official brand logo for your seller storefront."
                      accept="image/*"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2 font-semibold"
                size="lg"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <>
                    <Spinner size="sm" /> Saving Profile...
                  </>
                ) : (
                  <>
                    Save Profile & Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* STEP 2: WAREHOUSE ADDRESS */}
        {step === 2 && (
          <Form {...warehouseForm}>
            <form
              onSubmit={warehouseForm.handleSubmit((values) => warehouseMutation.mutate(values))}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold">Step 2: Dispatch Warehouse Address</h3>
                <p className="text-xs text-muted-foreground">
                  Provide your primary warehouse or fulfillment location for order pick-ups.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={warehouseForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        Warehouse Label <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Main Hub / Central Store" {...field} />
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
                      <FormLabel className="font-semibold">
                        Contact Person <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Dispatch Manager Name" {...field} />
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
                    <FormLabel className="font-semibold">
                      Warehouse Contact Phone <span className="text-destructive">*</span>
                    </FormLabel>
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
                    <FormLabel className="font-semibold">
                      Street Address Line 1 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ward No. / Street / Tole Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={warehouseForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">
                        City <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Kathmandu" {...field} />
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
                      <FormLabel className="font-semibold">
                        District <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Kathmandu" {...field} />
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
                      <FormLabel className="font-semibold">
                        Province <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Bagmati Province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-1/3"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 gap-2 font-semibold"
                  size="lg"
                  disabled={warehouseMutation.isPending}
                >
                  {warehouseMutation.isPending ? (
                    <>
                      <Spinner size="sm" /> Saving Warehouse...
                    </>
                  ) : (
                    <>
                      Save & Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* STEP 3: KYC DOCUMENTS */}
        {step === 3 && (
          <Form {...documentsForm}>
            <form
              onSubmit={documentsForm.handleSubmit((values) => documentsMutation.mutate(values))}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold">Step 3: Upload KYC Verification Photos</h3>
                <p className="text-xs text-muted-foreground">
                  Upload clear photos of your official business documents (JPEG, PNG, WEBP, AVIF).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={documentsForm.control}
                  name="panDocumentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentUploader
                        label="PAN Certificate Photo"
                        description="Clear photo of official PAN registration document issued by Inland Revenue."
                        required
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={documentsForm.control}
                  name="citizenshipDocumentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentUploader
                        label="Citizenship Card Photo"
                        description="Clear photo of the business owner's Citizenship Card (Front/Back)."
                        required
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={documentsForm.control}
                  name="vatDocumentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentUploader
                        label="VAT Certificate Photo (Optional)"
                        description="Value Added Tax registration photo if applicable."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={documentsForm.control}
                  name="businessRegDocumentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <DocumentUploader
                        label="Business Registration Photo (Optional)"
                        description="Company registrar certificate or local ward registration photo."
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-1/3"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 gap-2 font-semibold"
                  size="lg"
                  disabled={documentsMutation.isPending}
                >
                  {documentsMutation.isPending ? (
                    <>
                      <Spinner size="sm" /> Saving Documents...
                    </>
                  ) : (
                    <>
                      Save Documents & Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* STEP 4: LEGAL BUSINESS INFO */}
        {step === 4 && (
          <Form {...businessForm}>
            <form
              onSubmit={businessForm.handleSubmit((values) => businessMutation.mutate(values))}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold">Step 4: Legal Business Identification</h3>
                <p className="text-xs text-muted-foreground">
                  Provide your registered business details as listed on your legal tax documents.
                </p>
              </div>

              <FormField
                control={businessForm.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Registered Business Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Legal entity name on PAN/VAT certificate" {...field} />
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
                    <FormLabel className="font-semibold">
                      Business Registration / PAN Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="PAN/Reg Number e.g. 600XXXXXX" {...field} />
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
                    <FormLabel className="font-semibold">
                      Business Contact Phone <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="98XXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="w-1/3"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 gap-2 font-semibold"
                  size="lg"
                  disabled={businessMutation.isPending}
                >
                  {businessMutation.isPending ? (
                    <>
                      <Spinner size="sm" /> Saving Business Info...
                    </>
                  ) : (
                    <>
                      Save & Proceed to Review <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* STEP 5: REVIEW & SUBMIT */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">Step 5: Final Review & Application Submission</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Please confirm that all business documents and addresses are accurate before
                submitting for platform verification.
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/20 space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Store Name / Description
                </span>
                <span className="font-semibold text-foreground text-xs">
                  {user?.vendorProfile?.shopDescription || 'Provided'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Business Legal Name
                </span>
                <span className="font-semibold text-foreground text-xs">
                  {user?.vendorProfile?.businessName || 'Provided'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground text-xs font-medium">
                  PAN / Registration No.
                </span>
                <span className="font-semibold text-foreground text-xs">
                  {user?.vendorProfile?.businessRegNumber || 'Provided'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs font-medium">KYC Documents</span>
                <span className="font-semibold text-success text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PAN & Citizenship Uploaded
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(4)} className="w-1/3">
                Back
              </Button>

              {isRejectedMode ? (
                <Button
                  className="w-2/3 gap-2 font-bold"
                  size="lg"
                  onClick={() => resubmitMutation.mutate()}
                  disabled={resubmitMutation.isPending}
                >
                  {resubmitMutation.isPending ? (
                    <>
                      <Spinner size="sm" /> Resubmitting Revision...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Resubmit Application for Review
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-2/3 gap-2 font-bold"
                  size="lg"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Spinner size="sm" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Profile for Review
                    </>
                  )}
                </Button>
              )}
            </div>

            {(submitMutation.isError || resubmitMutation.isError) && (
              <p className="text-xs text-destructive font-medium text-center">
                Failed to submit profile. Please ensure all required steps are filled out.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
