import { memo } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { ClipboardList } from 'lucide-react';

import BasicInfoSection from '../basic-info-section';

interface AddProductBasicSectionProps {
  control: Control<FieldValues>;
  watchedCategoryId: string;
  watchedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onBasicFieldChange: (name: 'name' | 'brand' | 'description', value: string) => void;
  onCategoryPathChange?: (path: string[]) => void;
  categoryPath?: string[];
  hideBrand?: boolean;
  hideName?: boolean;
}

export const AddProductBasicSection = memo(function AddProductBasicSection({
  control,
  watchedCategoryId,
  watchedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  onBasicFieldChange,
  onCategoryPathChange,
  categoryPath,
  hideBrand,
  hideName,
}: AddProductBasicSectionProps) {
  return (
    <section
      id="product-section-basic"
      className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-xs"
    >
      <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Basic Information</h3>
          <p className="text-xs text-muted-foreground">
            Start with the category, name, brand, and description. The remaining sections adapt to
            the chosen category.
          </p>
        </div>
      </div>
      <BasicInfoSection
        control={control}
        selectedCategoryId={watchedCategoryId}
        selectedSubcategoryId={watchedSubcategoryId}
        onCategoryChange={onCategoryChange}
        onSubcategoryChange={onSubcategoryChange}
        onFieldChange={onBasicFieldChange}
        onCategoryPathChange={onCategoryPathChange}
        categoryPath={categoryPath}
        hideBrand={hideBrand}
        hideName={hideName}
      />
    </section>
  );
});
