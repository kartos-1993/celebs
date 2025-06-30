/**
 * Custom hook for managing category UI state
 * Encapsulates all UI-related state and actions
 */

import { useState, useCallback } from 'react';
import { Category, CategoryUIState } from '../types';

interface UseCategoryStateReturn {
  uiState: CategoryUIState;
  actions: {
    // Form actions
    openAddCategoryForm: () => void;
    openAddSubcategoryForm: (parentId: string) => void;
    openEditForm: (category: Category) => void;
    closeForm: () => void;
    setFormOpen: (open: boolean) => void;

    // Delete actions
    openDeleteDialog: (categoryId: string) => void;
    closeDeleteDialog: () => void;
    setDeleteDialogOpen: (open: boolean) => void;

    // Tree expansion
    toggleCategory: (categoryId: string) => void;
    setExpandedCategories: (expanded: Record<string, boolean>) => void;
  };
}

export function useCategoryState(): UseCategoryStateReturn {
  const [uiState, setUiState] = useState<CategoryUIState>({
    isLoading: false,
    error: null,
    expandedCategories: {},
    selectedCategory: null,
    isFormOpen: false,
    isDeleteDialogOpen: false,
    editingCategory: null,
    parentCategoryId: null,
    categoryToDelete: null,
  });

  // Form actions
  const openAddCategoryForm = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      isFormOpen: true,
      editingCategory: null,
      parentCategoryId: null,
    }));
  }, []);

  const openAddSubcategoryForm = useCallback((parentId: string) => {
    setUiState((prev) => ({
      ...prev,
      isFormOpen: true,
      editingCategory: null,
      parentCategoryId: parentId,
    }));
  }, []);

  const openEditForm = useCallback((category: Category) => {
    setUiState((prev) => ({
      ...prev,
      isFormOpen: true,
      editingCategory: category,
      parentCategoryId: null,
    }));
  }, []);

  const closeForm = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      isFormOpen: false,
      editingCategory: null,
      parentCategoryId: null,
    }));
  }, []);

  const setFormOpen = useCallback((open: boolean) => {
    setUiState((prev) => ({
      ...prev,
      isFormOpen: open,
      ...(open ? {} : { editingCategory: null, parentCategoryId: null }),
    }));
  }, []);

  // Delete actions
  const openDeleteDialog = useCallback((categoryId: string) => {
    setUiState((prev) => ({
      ...prev,
      isDeleteDialogOpen: true,
      categoryToDelete: categoryId,
    }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      isDeleteDialogOpen: false,
      categoryToDelete: null,
    }));
  }, []);

  const setDeleteDialogOpen = useCallback((open: boolean) => {
    setUiState((prev) => ({
      ...prev,
      isDeleteDialogOpen: open,
      ...(open ? {} : { categoryToDelete: null }),
    }));
  }, []);

  // Tree expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setUiState((prev) => ({
      ...prev,
      expandedCategories: {
        ...prev.expandedCategories,
        [categoryId]: !prev.expandedCategories[categoryId],
      },
    }));
  }, []);

  const setExpandedCategories = useCallback(
    (expanded: Record<string, boolean>) => {
      setUiState((prev) => ({
        ...prev,
        expandedCategories: expanded,
      }));
    },
    [],
  );

  return {
    uiState,
    actions: {
      openAddCategoryForm,
      openAddSubcategoryForm,
      openEditForm,
      closeForm,
      setFormOpen,
      openDeleteDialog,
      closeDeleteDialog,
      setDeleteDialogOpen,
      toggleCategory,
      setExpandedCategories,
    },
  };
}
