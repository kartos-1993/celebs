import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { vendorProfileSchema } from '@celebs/shared-types';
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

import { useUpdateProfileMutation } from '../hooks/use-vendor-onboarding-mutations';
import type { VendorProfileFormValues } from '../types';

import { DocumentUploader } from './document-uploader';

interface StepProfileFormProps {
  initialValues: VendorProfileFormValues;
  onSuccess: () => void;
}

export function StepProfileForm({ initialValues, onSuccess }: StepProfileFormProps) {
  const profileForm = useForm<VendorProfileFormValues>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: initialValues,
  });

  const profileMutation = useUpdateProfileMutation(onSuccess);

  const onSubmit = (values: VendorProfileFormValues) => {
    profileMutation.mutate(values);
  };

  return (
    <Form {...profileForm}>
      <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-5">
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
  );
}
