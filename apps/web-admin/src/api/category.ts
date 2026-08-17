/**
 * Shared Category API Client and Query Keys
 * Available for cross-feature consumption (Products, Navigation, Storefront, Category Admin)
 */
export {
  CATEGORY_QUERY_KEYS,
  CategoryApiService as SharedCategoryApi,
  getCategoryTree,
  searchCategories,
  getRecentCategories,
  recordRecentCategory,
  getCategoryById,
} from '../features/category/api';
