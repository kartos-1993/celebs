import { useState, useEffect } from 'react';
import Constants from 'expo-constants';

export interface Category {
  _id: string;
  name: string;
  displayName?: string;
  imageUrl?: string | null;
  level: number;
}

// API URL helper to dynamically target local server IP in Expo
const getApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
  return `http://${localhost}:3333/api/v1`;
};

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const url = `${getApiUrl()}/category/tree-with-attributes`;
      const response = await fetch(url);
      const resData = await response.json();
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
          setCategories(flattened);
        } else {
          setCategories([]);
        }
      }
    } catch (error) {
      console.warn('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    refetch: fetchCategories,
  };
}
