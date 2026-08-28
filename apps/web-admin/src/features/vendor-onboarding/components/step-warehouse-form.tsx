import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { warehouseSchema } from '@celebs/shared-types';
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

import { useUpdateWarehouseMutation } from '../hooks/use-vendor-onboarding-mutations';
import type { WarehouseFormValues } from '../types';

interface StepWarehouseFormProps {
  initialValues: WarehouseFormValues;
  onSuccess: () => void;
  onBack: () => void;
}

export function StepWarehouseForm({ initialValues, onSuccess, onBack }: StepWarehouseFormProps) {
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: initialValues,
  });

  const mutation = useUpdateWarehouseMutation(onSuccess);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <div>
          <h3 className="text-lg font-bold">Step 2: Dispatch Warehouse Address</h3>
          <p className="text-xs text-muted-foreground">
            Provide your primary warehouse or fulfillment location for order pick-ups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Warehouse Label <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Main Hub" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
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
          control={form.control}
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
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">
                Street Address Line 1 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Ward No, Street, Building Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
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
            control={form.control}
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
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">
                  Province <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Bagmati" {...field} />
                </FormControl>
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
                <Spinner size="sm" /> Saving...
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
  );
}
