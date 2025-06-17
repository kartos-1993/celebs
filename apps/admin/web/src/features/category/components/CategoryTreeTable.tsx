/**
 * Category tree table component
 * Displays hierarchical category structure in a table format
 */

import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '@/components/ui/table';
import { CategoryTreeRow } from './CategoryTreeRow';
import { CategoryTreeNode } from '../types';

interface CategoryTreeTableProps {
  categoryTree: CategoryTreeNode[];
  expandedCategories: Record<string, boolean>;
  onToggleExpand: (categoryId: string) => void;
  onEdit: (category: CategoryTreeNode) => void;
  onDelete: (categoryId: string) => void;
  onAddSubcategory: (parentId: string) => void;
}

export const CategoryTreeTable: React.FC<CategoryTreeTableProps> = ({
  categoryTree,
  expandedCategories,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddSubcategory,
}) => {
  const renderCategoryRows = (
    categories: CategoryTreeNode[],
    level = 0,
  ): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];

    categories.forEach((category) => {
      // Add the category row
      rows.push(
        <CategoryTreeRow
          key={category._id}
          category={category}
          level={level}
          isExpanded={expandedCategories[category._id] || false}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubcategory={onAddSubcategory}
        />,
      );

      // Add child rows if expanded and has children
      if (
        expandedCategories[category._id] &&
        category.children &&
        category.children.length > 0
      ) {
        rows.push(...renderCategoryRows(category.children, level + 1));
      }
    });

    return rows;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[400px]">Category Name & Level</TableHead>
          <TableHead>Attributes</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{renderCategoryRows(categoryTree)}</TableBody>
    </Table>
  );
};
