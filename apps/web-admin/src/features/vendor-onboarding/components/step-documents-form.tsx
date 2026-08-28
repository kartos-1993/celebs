import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { vendorDocumentsSchema } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Form, FormField, FormItem, FormMessage } from '@celebs/shared-ui/components/form';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useUpdateDocumentsMutation } from '../hooks/use-vendor-onboarding-mutations';
import type { VendorDocumentsFormValues } from '../types';

import { DocumentUploader } from './document-uploader';

interface StepDocumentsFormProps {
  initialValues: VendorDocumentsFormValues;
  onSuccess: () => void;
  onBack: () => void;
}

export function StepDocumentsForm({ initialValues, onSuccess, onBack }: StepDocumentsFormProps) {
  const form = useForm<VendorDocumentsFormValues>({
    resolver: zodResolver(vendorDocumentsSchema),
    defaultValues: initialValues,
  });

  const mutation = useUpdateDocumentsMutation(onSuccess);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <div>
          <h3 className="text-lg font-bold">Step 3: Upload KYC Verification Photos</h3>
          <p className="text-xs text-muted-foreground">
            Upload clear photos of your official business documents (JPEG, PNG, WEBP, AVIF).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
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
            control={form.control}
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
            control={form.control}
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
            control={form.control}
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
          <Button type="button" variant="outline" onClick={onBack} className="w-1/3">
            Back
          </Button>
          <Button
            type="submit"
            className="w-2/3 gap-2 font-semibold"
            size="lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
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
  );
}
