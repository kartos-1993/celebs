import { memo } from 'react';
import type { Control, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Textarea } from '@celebs/shared-ui/components/textarea';

import { useFieldErrorReveal } from '../hooks/use-submission-state';

import { BrandSelector } from './brand-selector';

interface BasicInfoInputsProps {
  control: Control<FieldValues>;
  hideName?: boolean;
  hideBrand?: boolean;
  onFieldChange: (name: 'name' | 'brand' | 'description', value: string) => void;
  onBrandSelect: (brandName: string) => void;
}

export const BasicInfoInputs = memo(function BasicInfoInputs({
  control,
  hideName,
  hideBrand,
  onFieldChange,
  onBrandSelect,
}: BasicInfoInputsProps) {
  // Gated PER FIELD: typing a product name must not surface its siblings' errors.
  const { revealError } = useFieldErrorReveal(control);
  return (
    <div className="grid gap-6">
      {!hideName && (
        <FormField
          control={control}
          name="name"
          rules={{
            required: 'Product name is required', // zod: z.string().trim().min(2).max(200)
            minLength: { value: 2, message: 'Product name must be at least 2 characters' },
            maxLength: { value: 200, message: 'Product name must be less than 200 characters' },
          }}
          render={({ field }) => {
            const charCount = String(field.value || '').length;
            return (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>
                    Product Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <span
                    className={
                      charCount > 0 && charCount < 2
                        ? 'text-xs font-medium text-warning'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {charCount}/200
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Enter a clear, searchable product title (min. 2 characters)"
                    data-testid="product-name-input"
                    maxLength={200}
                    rows={2}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      onFieldChange('name', event.target.value);
                    }}
                    className="min-h-[58px] resize-y rounded-2xl border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  Include the key identifier, style, or collection name buyers would search for.
                </FormDescription>
                {revealError('name') && <FormMessage />}
              </FormItem>
            );
          }}
        />
      )}

      {!hideBrand && (
        <FormField
          control={control}
          name="brandId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BrandSelector
                  value={field.value}
                  onChange={(brandId, brandName) => {
                    field.onChange(brandId);
                    onBrandSelect(brandName || '');
                    onFieldChange('brand', brandName || '');
                  }}
                />
              </FormControl>
              {revealError('brandId') && <FormMessage />}
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="description"
        rules={{
          maxLength: { value: 4000, message: 'Description must be less than 4000 characters' },
        }}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-3">
              <FormLabel>
                Product Description{' '}
                <span className="font-normal text-xs text-muted-foreground">(Optional)</span>
              </FormLabel>
              <span className="text-xs text-muted-foreground">
                {String(field.value || '').length}/4000
              </span>
            </div>
            <FormControl>
              <Textarea
                placeholder="Describe the material, fit, standout features, and customer-facing details."
                data-testid="product-desc-input"
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  onFieldChange('description', event.target.value);
                }}
                className="min-h-36 rounded-3xl border-border bg-card px-4 py-3 text-foreground"
              />
            </FormControl>
            <FormDescription className="text-xs text-muted-foreground">
              This description is used for the published product page and should be specific enough
              for customers to understand the item.
            </FormDescription>
            {revealError('description') && <FormMessage />}
          </FormItem>
        )}
      />
    </div>
  );
});
