import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface Category {
  id: string;
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
      const flattened: Category[] = [];

      const processNodes = (nodes: any[], parentName?: string) => {
        nodes.forEach((node) => {
          const prefixRegex = parentName ? new RegExp(`^${parentName}\\s+`, 'i') : null;
          const displayName = prefixRegex ? node.name.replace(prefixRegex, '') : node.name;

          flattened.push({
            ...node,
            displayName,
          });

          if (node.children && node.children.length > 0) {
            processNodes(node.children, parentName || node.name);
          }
        });
      };

      // Process all root categories dynamically
      resData.data.forEach((rootCat: any) => {
        if (rootCat.children && rootCat.children.length > 0) {
          processNodes(rootCat.children, rootCat.name);
        } else {
          flattened.push({
            ...rootCat,
            displayName: rootCat.name,
          });
        }
      });

      return flattened;
    }
    return [];
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: __DEV__ ? 0 : 1000 * 60 * 5, // 0s in dev for instant updates, 5 mins in prod
  });

  return {
    categories: data || [],
    loading: isLoading,
    refetch,
  };
}
