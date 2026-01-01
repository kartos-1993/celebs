/**
 * Individual category row component for the tree table
 */

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
import { CategoryTreeNode } from '../types';

interface CategoryTreeRowProps {
  category: CategoryTreeNode;
  level: number;
  isExpanded: boolean;
  onToggleExpand: (categoryId: string) => void;
  onEdit: (category: CategoryTreeNode) => void;
  onDelete: (categoryId: string) => void;
  onAddSubcategory: (parentId: string) => void;
}

export const CategoryTreeRow: React.FC<CategoryTreeRowProps> = ({
  category,
  level,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddSubcategory,
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const indent = level * 24;

  return (
    <TableRow
      className={
        level > 0
          ? 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }
    >
      {/* Category Name Column */}
      <TableCell className="font-medium">
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${indent}px` }}
        >
          {hasChildren ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onToggleExpand(category._id)}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </Button>
          ) : (
            <div className="w-8" />
          )}

          <span className="flex items-center gap-2">
            {category.name}
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
              Level {category.level}
            </span>
            {category.parent && (
              <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                Subcategory
              </span>
            )}
          </span>
        </div>
      </TableCell>

      {/* Attributes Column */}
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {category.attributes?.length > 0 ? (
            category.attributes.map((attr, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-fashion-100 px-2.5 py-0.5 text-xs font-medium text-fashion-700"
              >
                {attr.name} ({attr.type})
                {attr.isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">No attributes</span>
          )}
        </div>
      </TableCell>

      {/* Actions Column */}
      <TableCell>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
            onClick={() => onEdit(category)}
            title="Edit category"
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
            onClick={() => onDelete(category._id)}
            title="Delete category"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
            onClick={() => onAddSubcategory(category._id)}
            title="Add subcategory"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
