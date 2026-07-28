/**
 * Category feature exports
 * Centralized exports for the category feature
 */

// Main component
export { default } from './components/categories';

// Types
export * from './types';

// Hooks
export {
  useCategories,
  useCategory,
  CATEGORY_QUERY_KEYS,
} from './hooks/use-categories';
export { useCategoryState } from './hooks/use-category-state';
export { useCategoryForm } from './hooks/use-category-form';

// API
export { CategoryApiService } from './api';

// Components
export { CategoryFormDialog } from './components/category-form-dialog';
export { CategoryTree } from './components/category-tree';
export { DeleteCategoryDialog } from './components/delete-category-dialog';
export { EmptyState } from './components/empty-state';
export { ErrorState } from './components/error-state';
export { LoadingState } from './components/loading-state';
export { CategoryForm } from './components/category-form';
