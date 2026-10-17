import { useForm } from 'react-hook-form';
import { act,renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FieldSpec, ProductFormValues } from '../../../types';
import { useAddProductSubmit } from '../use-add-product-submit';

const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../../hooks/use-product-queries', () => ({
  useProductMutations: () => ({
    create: { mutateAsync: mockCreateMutateAsync },
    update: { mutateAsync: mockUpdateMutateAsync },
  }),
}));

const mockFields: FieldSpec[] = [
  { name: 'name', label: 'Product Name', uiType: 'input', group: 'basic', required: true },
  { name: 'price', label: 'Price', uiType: 'number', group: 'pricing', required: true },
  { name: 'categoryId', label: 'Category', uiType: 'input', group: 'basic', required: true },
  { name: 'subcategoryId', label: 'Subcategory', uiType: 'input', group: 'basic', required: true },
];

const mockDraft = {
  draftRestored: true,
  restoredDraftAt: null,
  categoryPath: undefined,
  setCategoryPath: vi.fn(),
  isDraftAutosaveSuppressed: false,
  saveDraftNow: vi.fn(),
  clearSavedDraft: vi.fn(),
  discardDraft: vi.fn(),
  resetForNewCategory: vi.fn(),
};

describe('useAddProductSubmit — Section Gate and Draft Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks published submission when required form sections are incomplete', async () => {
    const { result } = renderHook(() => {
      const form = useForm<ProductFormValues>({
        defaultValues: {
          name: '',
          price: '' as unknown as number,
          categoryId: '',
          subcategoryId: '',
        },
      });
      return useAddProductSubmit({
        form,
        schemaFields: mockFields,
        schemaHasName: true,
        variantMeta: [],
        draft: mockDraft,
        isEditMode: false,
      });
    });

    await act(async () => {
      await result.current.handleSubmitProduct('published');
    });

    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows draft submission to save directly to backend even when sections are incomplete', async () => {
    mockCreateMutateAsync.mockResolvedValueOnce({ id: 'draft-123' });

    const { result } = renderHook(() => {
      const form = useForm<ProductFormValues>({
        defaultValues: {
          name: 'Draft Sneakers',
          categoryId: 'cat-shoes',
          subcategoryId: 'sub-sneakers',
          price: 150,
        },
      });
      return useAddProductSubmit({
        form,
        schemaFields: mockFields,
        schemaHasName: true,
        variantMeta: [],
        draft: mockDraft,
        isEditMode: false,
      });
    });

    await act(async () => {
      await result.current.handleSubmitProduct('draft');
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Draft Sneakers',
        status: 'draft',
      }),
    );
    expect(mockDraft.clearSavedDraft).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/products/manage', { replace: true });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Draft saved',
      }),
    );
  });
});
