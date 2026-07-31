import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  displayName?: string;
  imageUrl?: string | null;
  level: number;
}

export function useCategories() {
  const fetchCategories = async (): Promise<Category[]> => {
    const response = await apiClient.get('/category/tree-with-attributes', { skipAuth: true });
    const resData = response.data;
    if (resData.success && Array.isArray(resData.data)) {
      // Find the 'Men' root category or fallback to the first root category
      const rootCategory = resData.data.find((c: any) => c.slug === 'men') || resData.data[0];
      if (rootCategory && Array.isArray(rootCategory.children)) {
        const flattened: Category[] = [];
        const prefixRegex = new RegExp(`^${rootCategory.name}\\s+`, 'i');

        const processNodes = (nodes: any[]) => {
          nodes.forEach(node => {
            // Create display name without prefix
            const displayName = node.name.replace(prefixRegex, '');

            flattened.push({
              ...node,
              displayName,
            });

            if (node.children && node.children.length > 0) {
              processNodes(node.children);
            }
          });
        };

        processNodes(rootCategory.children);
        return flattened;
      }
    }
    return [];
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (rarely changes)
  });

  return {
    categories: data || [],
    loading: isLoading,
    refetch,
  };
}
