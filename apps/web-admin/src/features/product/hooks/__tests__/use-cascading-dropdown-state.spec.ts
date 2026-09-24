import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DropdownCategory, RecentCategory } from '@celebs/shared-types';

import { useCascadingDropdownState } from '../use-cascading-dropdown-state';

// Mock dependencies
const mockCategoryTree: DropdownCategory[] = [
  {
    id: 'cat-root-1',
    name: 'Electronics',
    parentCategory: null,
    hasChildren: true,
    level: 0,
    path: ['Electronics'],
  },
  {
    id: 'cat-leaf-1',
    name: 'Laptops',
    parentCategory: 'cat-root-1',
    hasChildren: false,
    level: 1,
    path: ['Electronics', 'Laptops'],
  },
  {
    id: 'cat-leaf-2',
    name: 'Smartphones',
    parentCategory: 'cat-root-1',
    hasChildren: false,
    level: 1,
    path: ['Electronics', 'Smartphones'],
  },
];

vi.mock('../use-category-tree', () => ({
  useCategoryTree: () => ({
    getRootCategories: () => [mockCategoryTree[0]],
    getChildCategories: (parentId: string) =>
      mockCategoryTree.filter((c) => c.parentCategory === parentId),
    searchCategories: () => [],
    recentCategories: [
      {
        id: 'cat-leaf-2',
        name: 'Smartphones',
        path: ['Electronics', 'Smartphones'],
        usedAt: new Date().toISOString(),
      },
    ],
    addToRecent: vi.fn(),
    findCategoryById: (id: string) => mockCategoryTree.find((c) => c.id === id),
    isLoading: false,
  }),
}));

vi.mock('../use-category-search-query', () => ({
  useCategorySearchQuery: () => ({
    data: [],
    isFetching: false,
  }),
}));

describe('useCascadingDropdownState Category Confirmation Flow', () => {
  const currentCategory: DropdownCategory = mockCategoryTree[1]; // Laptops
  const newCategory: DropdownCategory = mockCategoryTree[2]; // Smartphones
  const recentItem: RecentCategory = {
    id: newCategory.id,
    name: newCategory.name,
    path: newCategory.path,
    usedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts confirmation when user has entered form data and attempts to change category via confirm button', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useCascadingDropdownState({
        selectedCategory: currentCategory,
        isDirty: () => true, // User has entered data
        onSelect,
      }),
    );

    // Open dropdown and simulate clicking through to a new leaf category
    act(() => {
      result.current.handleOpenChange(true);
      result.current.handleCategoryClick(mockCategoryTree[0], 0); // Electronics
    });

    act(() => {
      result.current.handleCategoryClick(newCategory, 1); // Smartphones (leaf)
    });

    expect(result.current.canConfirm).toBe(true);

    // Click confirm in footer
    act(() => {
      result.current.handleConfirm();
    });

    // Expect dialog to open, popover to close, and pendingCategory set
    expect(result.current.isConfirmModalOpen).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.pendingCategory?.id).toBe(newCategory.id);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('cancels category change cleanly without side effects when user cancels dialog', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useCascadingDropdownState({
        selectedCategory: currentCategory,
        isDirty: () => true,
        onSelect,
      }),
    );

    act(() => {
      result.current.handleRecentSelect(recentItem);
    });

    expect(result.current.isConfirmModalOpen).toBe(true);
    expect(result.current.pendingCategory?.id).toBe(newCategory.id);

    // User cancels
    act(() => {
      result.current.handleConfirmModalCancel();
    });

    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(result.current.pendingCategory).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('proceeds with category switch when user confirms in dialog', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useCascadingDropdownState({
        selectedCategory: currentCategory,
        isDirty: () => true,
        onSelect,
      }),
    );

    act(() => {
      result.current.handleRecentSelect(recentItem);
    });

    expect(result.current.isConfirmModalOpen).toBe(true);

    // User confirms
    act(() => {
      result.current.handleConfirmModalProceed();
    });

    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(result.current.pendingCategory).toBeNull();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: newCategory.id,
        name: newCategory.name,
      }),
    );
  });

  it('directly commits category without dialog when form has no entered data', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useCascadingDropdownState({
        selectedCategory: currentCategory,
        isDirty: () => false, // Form is pristine
        onSelect,
      }),
    );

    act(() => {
      result.current.handleRecentSelect(recentItem);
    });

    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(result.current.pendingCategory).toBeNull();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: newCategory.id,
        name: newCategory.name,
      }),
    );
  });

  it('does not prompt dialog if user re-selects the currently active category', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useCascadingDropdownState({
        selectedCategory: currentCategory,
        isDirty: () => true,
        onSelect,
      }),
    );

    const sameCategoryRecent: RecentCategory = {
      id: currentCategory.id,
      name: currentCategory.name,
      path: currentCategory.path,
      usedAt: new Date().toISOString(),
    };

    act(() => {
      result.current.handleRecentSelect(sameCategoryRecent);
    });

    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(result.current.pendingCategory).toBeNull();
    expect(onSelect).toHaveBeenCalled();
  });
});
