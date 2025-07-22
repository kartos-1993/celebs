import { useState, useEffect } from 'react';
import { Category, RecentCategory } from '../components/cascading-dropdown';

// Mock API functions - replace with actual API calls
const mockCategories: Category[] = [
  { id: '1', name: 'Electronics', parentId: null, hasChildren: true, level: 0, path: ['Electronics'] },
  { id: '2', name: 'Clothing', parentId: null, hasChildren: true, level: 0, path: ['Clothing'] },
  { id: '3', name: 'Home & Garden', parentId: null, hasChildren: true, level: 0, path: ['Home & Garden'] },
  { id: '4', name: 'Sports', parentId: null, hasChildren: true, level: 0, path: ['Sports'], },
  { id: '1', name: 'Electronics', parentId: null, hasChildren: true, level: 0, path: ['Electronics'] },
  { id: '2', name: 'Clothing', parentId: null, hasChildren: true, level: 0, path: ['Clothing'] },
  { id: '3', name: 'Home & Garden', parentId: null, hasChildren: true, level: 0, path: ['Home & Garden'] },
  { id: '4', name: 'Sports', parentId: null, hasChildren: true, level: 0, path: ['Sports'], },{ id: '1', name: 'Electronics', parentId: null, hasChildren: true, level: 0, path: ['Electronics'] },
  { id: '2', name: 'Clothing', parentId: null, hasChildren: true, level: 0, path: ['Clothing'] },
  { id: '3', name: 'Home & Garden', parentId: null, hasChildren: true, level: 0, path: ['Home & Garden'] },
  { id: '4', name: 'Sports', parentId: null, hasChildren: true, level: 0, path: ['Sports'], },
  
  // Electronics subcategories
  { id: '11', name: 'Computers', parentId: '1', hasChildren: true, level: 1, path: ['Electronics', 'Computers'] },
  { id: '12', name: 'Mobile Phones', parentId: '1', hasChildren: true, level: 1, path: ['Electronics', 'Mobile Phones'] },
  { id: '13', name: 'Audio & Video', parentId: '1', hasChildren: false, level: 1, path: ['Electronics', 'Audio & Video'] },
  
  // Computers subcategories
  { id: '111', name: 'Laptops', parentId: '11', hasChildren: false, level: 2, path: ['Electronics', 'Computers', 'Laptops'] },
  { id: '112', name: 'Desktops', parentId: '11', hasChildren: false, level: 2, path: ['Electronics', 'Computers', 'Desktops'] },
  { id: '113', name: 'Accessories', parentId: '11', hasChildren: true, level: 2, path: ['Electronics', 'Computers', 'Accessories'] },
  
  // Mobile Phones subcategories
  { id: '121', name: 'Smartphones', parentId: '12', hasChildren: false, level: 2, path: ['Electronics', 'Mobile Phones', 'Smartphones'] },
  { id: '122', name: 'Feature Phones', parentId: '12', hasChildren: false, level: 2, path: ['Electronics', 'Mobile Phones', 'Feature Phones'] },
  
  // Clothing subcategories
  { id: '21', name: 'Men\'s Clothing', parentId: '2', hasChildren: true, level: 1, path: ['Clothing', 'Men\'s Clothing'] },
  { id: '22', name: 'Women\'s Clothing', parentId: '2', hasChildren: true, level: 1, path: ['Clothing', 'Women\'s Clothing'] },
  { id: '23', name: 'Kids\' Clothing', parentId: '2', hasChildren: false, level: 1, path: ['Clothing', 'Kids\' Clothing'] },
];

const mockRecentCategories: RecentCategory[] = [
  { id: '111', name: 'Laptops', path: ['Electronics', 'Computers', 'Laptops'], usedAt: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '21', name: 'Men\'s Clothing', path: ['Clothing', 'Men\'s Clothing'], usedAt: new Date(Date.now() - 1000 * 60 * 60) },
];

export const useCategories = () => {
  const [allCategories] = useState<Category[]>(mockCategories);
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>(mockRecentCategories);

  const getRootCategories = (): Category[] => {
    return allCategories.filter(cat => cat.parentId === null);
  };

  const getChildCategories = (parentId: string): Category[] => {
    return allCategories.filter(cat => cat.parentId === parentId);
  };

  const searchCategories = (query: string, parentId?: string): Category[] => {
    if (!query.trim()) return parentId ? getChildCategories(parentId) : getRootCategories();
    
    const searchTerm = query.toLowerCase();
    return allCategories.filter(cat => {
      const matchesName = cat.name.toLowerCase().includes(searchTerm);
      const matchesParent = parentId ? cat.parentId === parentId : true;
      return matchesName && matchesParent;
    });
  };

  const addToRecent = (category: Category) => {
    const newRecentCategory: RecentCategory = {
      id: category.id,
      name: category.name,
      path: category.path,
      usedAt: new Date(),
    };

    setRecentCategories(prev => {
      const filtered = prev.filter(item => item.id !== category.id);
      return [newRecentCategory, ...filtered].slice(0, 5); // Keep only 5 recent items
    });
  };

  return {
    getRootCategories,
    getChildCategories,
    searchCategories,
    recentCategories,
    addToRecent,
  };
};