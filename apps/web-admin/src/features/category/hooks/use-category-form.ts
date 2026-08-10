import { useState, ChangeEvent } from 'react';
import { useForm, useFieldArray, UseFormReturn, UseFieldArrayRemove } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { uploadFiles } from '@/features/product/api';
import { Category } from '../types';
import {
  createCategorySchema as categoryFormSchema,
  CreateCategoryType as CategoryFormData,
  CategoryAttributeType as AttributeFormInput,
} from '@celebs/shared-types';

export interface UseCategoryFormProps {
  initialData?: Partial<Category> | null;
  onSave: (data: CategoryFormData) => void;
}

export interface UseCategoryFormReturn {
  form: UseFormReturn<CategoryFormData>;
  attributeFields: Record<'id', string>[];
  appendAttribute: (value: AttributeFormInput) => void;
  removeAttribute: UseFieldArrayRemove;
  isUploadingImage: boolean;
  newColumnInput: string;
  setNewColumnInput: (val: string) => void;
  newBodyColumnInput: string;
  setNewBodyColumnInput: (val: string) => void;
  handleAddAttribute: () => void;
  handleAddSizeColumn: () => void;
  handleRemoveSizeColumn: (colToRemove: string) => void;
  handleAddBodyColumn: () => void;
  handleRemoveBodyColumn: (colToRemove: string) => void;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

function getAttributeId(attr: { id?: string }): string | undefined {
  if (attr.id) return String(attr.id);
  return undefined;
}

export const useCategoryForm = ({
  initialData,
  onSave,
}: UseCategoryFormProps): UseCategoryFormReturn => {
  const { toast } = useToast();
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [newColumnInput, setNewColumnInput] = useState<string>('');
  const [newBodyColumnInput, setNewBodyColumnInput] = useState<string>('');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent ?? (initialData as any)?.parentCategory ?? null,
      attributes: (initialData?.attributes || []).map((attr) => ({
        id: getAttributeId(attr),
        name: attr.name || '',
        label: attr.label || '',
        type: attr.type || 'text',
        values: (attr.values || [])
          .map((v) =>
            typeof v === 'string'
              ? v
              : ((v as { value?: string; name?: string }).value ??
                (v as { value?: string; name?: string }).name ??
                ''),
          )
          .filter(Boolean),
        isRequired: !!attr.isRequired,
        group: attr.group || (attr.isVariant ? 'variant' : 'details'),
        placeholder: attr.placeholder || '',
        info: attr.info || { help: '', top: '' },
        isVariant: !!attr.isVariant,
        useStandardOptions: !!attr.useStandardOptions,
        optionSetId: attr.optionSetId ? String(attr.optionSetId) : null,
      })),
      sizeChartColumns: initialData?.sizeChartColumns || [],
      bodyChartColumns: initialData?.bodyChartColumns || [],
      imageUrl: initialData?.imageUrl || null,
      isActive: initialData?.isActive !== false,
    },
  });

  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control: form.control,
    name: 'attributes',
  });

  const handleAddAttribute = () => {
    appendAttribute({
      name: '',
      label: '',
      type: 'text',
      values: [],
      isRequired: false,
      group: 'basic',
      placeholder: '',
      info: { help: '', top: '' },
      isVariant: false,
      useStandardOptions: false,
      optionSetId: null,
    });
  };

  const handleAddSizeColumn = () => {
    const trimmed = newColumnInput.trim();
    if (!trimmed) return;
    const current = form.getValues('sizeChartColumns') || [];
    if (!current.includes(trimmed)) {
      form.setValue('sizeChartColumns', [...current, trimmed], { shouldDirty: true });
    }
    setNewColumnInput('');
  };

  const handleRemoveSizeColumn = (colToRemove: string) => {
    const current = form.getValues('sizeChartColumns') || [];
    form.setValue(
      'sizeChartColumns',
      current.filter((c) => c !== colToRemove),
      { shouldDirty: true },
    );
  };

  const handleAddBodyColumn = () => {
    const trimmed = newBodyColumnInput.trim();
    if (!trimmed) return;
    const current = form.getValues('bodyChartColumns') || [];
    if (!current.includes(trimmed)) {
      form.setValue('bodyChartColumns', [...current, trimmed], { shouldDirty: true });
    }
    setNewBodyColumnInput('');
  };

  const handleRemoveBodyColumn = (colToRemove: string) => {
    const current = form.getValues('bodyChartColumns') || [];
    form.setValue(
      'bodyChartColumns',
      current.filter((c) => c !== colToRemove),
      { shouldDirty: true },
    );
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        setIsUploadingImage(true);
        const file = e.target.files[0];
        const urls = await uploadFiles([file]);
        if (urls && urls.length > 0) {
          form.setValue('imageUrl', urls[0], { shouldDirty: true });
        }
      } catch {
        toast({
          title: 'Image upload failed',
          description: 'Failed to upload category image. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const onSubmit = (values: CategoryFormData) => {
    const normalizedData: CategoryFormData = {
      ...values,
      parent: values.parent && values.parent !== 'ROOT_CATEGORY' ? values.parent : null,
      attributes: values.attributes.map((attr) => ({
        ...attr,
        id: attr.id || undefined,
        values: attr.values ?? [],
        isVariant: attr.isVariant ?? false,
        useStandardOptions: attr.isVariant ? (attr.useStandardOptions ?? false) : false,
        optionSetId:
          attr.isVariant && attr.useStandardOptions && attr.optionSetId
            ? attr.optionSetId.trim() || null
            : null,
        group: attr.isVariant ? 'variant' : attr.group || 'details',
      })),
    };

    onSave(normalizedData);
  };

  return {
    form,
    attributeFields,
    appendAttribute,
    removeAttribute,
    isUploadingImage,
    newColumnInput,
    setNewColumnInput,
    newBodyColumnInput,
    setNewBodyColumnInput,
    handleAddAttribute,
    handleAddSizeColumn,
    handleRemoveSizeColumn,
    handleAddBodyColumn,
    handleRemoveBodyColumn,
    handleImageUpload,
    handleSubmit: form.handleSubmit(onSubmit),
  };
};
