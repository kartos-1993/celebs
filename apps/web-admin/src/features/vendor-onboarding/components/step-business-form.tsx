import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { vendorBusinessInfoSchema } from '@celebs/shared-types';
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

import { useUpdateBusinessInfoMutation } from '../hooks/use-vendor-onboarding-mutations';
import type { VendorBusinessInfoFormValues } from '../types';

interface StepBusinessFormProps {
  initialValues: VendorBusinessInfoFormValues;
  onSuccess: () => void;
  onBack: () => void;
}

export function StepBusinessForm({ initialValues, onSuccess, onBack }: StepBusinessFormProps) {
  const form = useForm<VendorBusinessInfoFormValues>({
    resolver: zodResolver(vendorBusinessInfoSchema),
    defaultValues: initialValues,
  });

  const mutation = useUpdateBusinessInfoMutation(onSuccess);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <div>
          <h3 className="text-lg font-bold">Step 4: Legal Business Identification</h3>
          <p className="text-xs text-muted-foreground">
            Provide your registered business details as listed on your legal tax documents.
          </p>
        </div>

        <FormField
          control={form.control}
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
          control={form.control}
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
          control={form.control}
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
  );
}
