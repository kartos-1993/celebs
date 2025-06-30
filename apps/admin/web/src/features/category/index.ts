/**
 * Category feature exports
 * Centralized exports for the category feature
 */

// Main component
export { default } from './components/Categories';

// Types
export * from './types';

// Hooks
export {
  useCategories,
  useCategory,
  CATEGORY_QUERY_KEYS,
} from './hooks/useCategories';
export { useCategoryState } from './hooks/useCategoryState';

// API
export { CategoryApiService } from './api';

// Components
export { CategoryFormDialog } from './components/CategoryFormDialog';
export { CategoryTreeTable } from './components/CategoryTreeTable';
export { CategoryTreeRow } from './components/CategoryTreeRow';
export { DeleteCategoryDialog } from './components/DeleteCategoryDialog';
export { EmptyState } from './components/EmptyState';
export { ErrorState } from './components/ErrorState';
export { LoadingState } from './components/LoadingState';
