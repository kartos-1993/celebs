/**
 * Category Tree View Component
 * Uses TanStack Table to display hierarchical category structures with visual guidelines
 */

import React, { useCallback,useState } from 'react';
import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Edit, Folder, FolderOpen, Plus,Trash2 } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { CategoryTreeNode } from '../types';

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
  disabled,
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
      checked ? 'bg-primary' : 'bg-muted'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow transition duration-200 ease-in-out ${
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

  const handleActiveToggle = useCallback(
    async (categoryId: string, currentStatus: boolean) => {
      try {
        setUpdatingId(categoryId);
        await onToggleActive(categoryId, !currentStatus);
      } finally {
        setUpdatingId(null);
      }
    },
    [onToggleActive],
  );

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
            <div
              className="relative flex items-center h-10 select-none"
              style={{ paddingLeft: `${depth * 28}px` }}
            >
              {/* Hierarchical Connecting Lines */}
              {depth > 0 && (
                <>
                  {/* Vertical line rails for depth levels */}
                  {Array.from({ length: depth }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-dashed border-border"
                      style={{ left: `${i * 28 + 12}px` }}
                    />
                  ))}
                  {/* Horizontal L-joint joint connector to current row */}
                  <div
                    className="absolute border-b border-dashed border-border"
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
                    className="h-6 w-6 p-0 hover:bg-muted rounded"
                    onClick={() => row.toggleExpanded()}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                ) : (
                  <div className="w-6" />
                )}

                {/* Node Type Folders */}
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-primary shrink-0" />
                  )
                ) : (
                  <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                )}

                {/* Category Thumbnail Image */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="w-7 h-7 rounded-md object-cover border border-border shrink-0 ml-1"
                  />
                ) : (
                  <div className="w-7 h-7 bg-muted rounded-md border border-dashed border-border shrink-0 ml-1 flex items-center justify-center text-xs text-muted-foreground">
                    N/A
                  </div>
                )}

                {/* Category Name & Meta Info */}
                <div className="flex items-baseline gap-2 ml-1">
                  <span className="text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  <span className="text-xs tracking-wider text-muted-foreground font-mono">
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
          const isPending = updatingId === category.id;

          return (
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={isActive}
                disabled={isPending}
                onChange={() => handleActiveToggle(category.id, isActive)}
              />
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
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
            return <span className="text-muted-foreground text-xs italic">No attributes</span>;
          }

          const visibleAttrs = attrs.slice(0, 3);
          const hiddenCount = attrs.length - 3;

          return (
            <div className="flex gap-1.5 flex-wrap items-center">
              {visibleAttrs.map((attr, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border"
                  title={attr.name}
                >
                  {attr.label || attr.name}
                  {attr.isRequired && <span className="text-destructive ml-0.5 font-bold">*</span>}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground border border-border cursor-default"
                  title={attrs
                    .slice(3)
                    .map((a) => a.label || a.name)
                    .join(', ')}
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
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => onEdit(category)}
                title="Edit Category"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => onAddSubcategory(category.id)}
                title="Add Subcategory"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(category.id)}
                title="Delete Category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [onEdit, onDelete, onAddSubcategory, updatingId, handleActiveToggle],
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
    <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent border-b border-border"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-muted-foreground font-semibold text-xs py-3"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
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
                className="border-b border-border hover:bg-muted/40"
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
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground text-sm"
              >
                No categories found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
