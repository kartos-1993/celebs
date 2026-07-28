/**
 * Category Tree View Component
 * Uses TanStack Table to display hierarchical category structures with visual guidelines
 */

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  ExpandedState,
} from '@tanstack/react-table';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@celebs/shared-ui/components/table';
import { Button } from '@celebs/shared-ui/components/button';
import { 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Trash2, 
  FolderPlus, 
  Folder,
  FolderOpen,
  Plus
} from 'lucide-react';
import { CategoryTreeNode } from '../types';
import { ProductAPI } from '../../../lib/axios-client';

interface CategoryTreeProps {
  categoryTree: CategoryTreeNode[];
  onEdit: (category: CategoryTreeNode) => void;
  onDelete: (categoryId: string) => void;
  onAddSubcategory: (parentId: string) => void;
  onToggleActive: (categoryId: string, isActive: boolean) => Promise<void>;
}

// Custom Premium Toggle Switch Component
const ToggleSwitch = ({ 
  checked, 
  onChange, 
  disabled 
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void; 
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-950 shadow transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categoryTree,
  onEdit,
  onDelete,
  onAddSubcategory,
  onToggleActive,
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleActiveToggle = async (categoryId: string, currentStatus: boolean) => {
    try {
      setUpdatingId(categoryId);
      await onToggleActive(categoryId, !currentStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = React.useMemo<ColumnDef<CategoryTreeNode>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Category Info',
        cell: ({ row }) => {
          const depth = row.depth;
          const hasChildren = row.getCanExpand();
          const isExpanded = row.getIsExpanded();
          const category = row.original;

          return (
            <div className="relative flex items-center h-10 select-none" style={{ paddingLeft: `${depth * 28}px` }}>
              {/* Hierarchical Connecting Lines */}
              {depth > 0 && (
                <>
                  {/* Vertical line rails for depth levels */}
                  {Array.from({ length: depth }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-dashed border-gray-300 dark:border-gray-800/80"
                      style={{ left: `${i * 28 + 12}px` }}
                    />
                  ))}
                  {/* Horizontal L-joint joint connector to current row */}
                  <div
                    className="absolute border-b border-dashed border-gray-300 dark:border-gray-800/80"
                    style={{
                      left: `${(depth - 1) * 28 + 12}px`,
                      width: '16px',
                      top: '50%',
                    }}
                  />
                </>
              )}

              {/* Node Expand/Collapse Action */}
              <div className="flex items-center gap-1.5 z-10">
                {hasChildren ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-gray-150 dark:hover:bg-gray-800/80 rounded"
                    onClick={() => row.toggleExpanded()}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                ) : (
                  <div className="w-6" />
                )}

                {/* Node Type Folders */}
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-fashion-600 dark:text-fashion-400 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-fashion-600 dark:text-fashion-400 shrink-0" />
                  )
                ) : (
                  <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                )}

                {/* Category Thumbnail Image */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="w-7 h-7 rounded-md object-cover border border-gray-200 dark:border-gray-800 shrink-0 ml-1"
                  />
                ) : (
                  <div className="w-7 h-7 bg-gray-100 dark:bg-gray-900 rounded-md border border-dashed border-gray-200 dark:border-gray-800 shrink-0 ml-1 flex items-center justify-center text-[10px] text-gray-400">
                    N/A
                  </div>
                )}

                {/* Category Name & Meta Info */}
                <div className="flex items-baseline gap-2 ml-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {category.name}
                  </span>
                  <span className="text-[10px] tracking-wider text-gray-400 dark:text-gray-500 font-mono">
                    L{category.level}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
          const category = row.original;
          const isActive = category.isActive !== false;
          const isPending = updatingId === category._id;

          return (
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={isActive}
                disabled={isPending}
                onChange={() => handleActiveToggle(category._id, isActive)}
              />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'attributes',
        header: 'Attributes',
        cell: ({ row }) => {
          const attrs = row.original.attributes || [];
          if (attrs.length === 0) {
            return <span className="text-gray-400 text-xs italic">No attributes</span>;
          }

          const visibleAttrs = attrs.slice(0, 3);
          const hiddenCount = attrs.length - 3;

          return (
            <div className="flex gap-1.5 flex-wrap items-center">
              {visibleAttrs.map((attr, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-fashion-50 dark:bg-fashion-950/30 px-2 py-0.5 text-xs font-medium text-fashion-700 dark:text-fashion-400 border border-fashion-100 dark:border-fashion-900/50"
                  title={attr.name}
                >
                  {attr.label || attr.name}
                  {attr.isRequired && (
                    <span className="text-red-500 ml-0.5 font-bold">*</span>
                  )}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span 
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-default"
                  title={attrs.slice(3).map(a => a.label || a.name).join(', ')}
                >
                  +{hiddenCount} more
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right pr-4">Actions</div>,
        cell: ({ row }) => {
          const category = row.original;

          return (
            <div className="flex gap-2 justify-end pr-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-600 dark:text-gray-400 dark:hover:text-fashion-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onEdit(category)}
                title="Edit Category"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-600 dark:text-gray-400 dark:hover:text-fashion-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onAddSubcategory(category._id)}
                title="Add Subcategory"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => onDelete(category._id)}
                title="Delete Category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [onEdit, onDelete, onAddSubcategory, updatingId]
  );

  const table = useReactTable({
    data: categoryTree,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-gray-200 dark:border-gray-800">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-gray-700 dark:text-gray-300 font-semibold text-xs py-3">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className="border-b border-gray-100 dark:border-gray-900/60 hover:bg-gray-50/40 dark:hover:bg-gray-900/20"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500 dark:text-gray-400 text-sm">
                No categories found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
