import type { ProductQueueItem } from '../components/review-queue/types';

export const formatProductCategoryBreadcrumb = (product: ProductQueueItem): string => {
  const isIdLike = (val?: string) => Boolean(val && /^[0-9a-f-]{24,36}$/i.test(val.trim()));

  const cat = product.category;
  const sub = product.subcategory;

  const catName =
    typeof cat === 'object' && cat?.name
      ? cat.name
      : typeof cat === 'string' && !isIdLike(cat)
        ? cat
        : '';
  const subName =
    typeof sub === 'object' && sub?.name
      ? sub.name
      : typeof sub === 'string' && !isIdLike(sub)
        ? sub
        : '';

  if (catName && subName && catName !== subName) {
    return `${catName} > ${subName}`;
  }
  if (subName) return subName;
  if (catName) return catName;

  if (typeof sub === 'object' && sub?.path) {
    return Array.isArray(sub.path) ? sub.path.join(' > ') : String(sub.path).split('/').join(' > ');
  }
  if (typeof cat === 'object' && cat?.path) {
    return Array.isArray(cat.path) ? cat.path.join(' > ') : String(cat.path).split('/').join(' > ');
  }

  return 'Uncategorized';
};
