import { useCallback, useMemo, useState } from 'react';

import type { DropdownCategory, RecentCategory } from '@celebs/shared-types';

import type { DropdownColumn } from '../types';
import {
  buildColumnsForPath,
  expandMatchesToLeaves,
  findNodeChain,
  resolvePathBySegments,
  ROOT_COLUMN,
  splitPathSegments,
} from '../utils/category-dropdown-helpers';

import { useCategorySearchQuery } from './use-category-search-query';
import { useCategoryTree } from './use-category-tree';

import { useDebounce } from '@/hooks/use-debounce';

interface CascadingDropdownStateProps {
  selectedCategory?: DropdownCategory | null;
  isDirty?: boolean;
  onSelect?: (category: DropdownCategory) => void;
}

export function useCascadingDropdownState({
  selectedCategory,
  isDirty = false,
  onSelect,
}: CascadingDropdownStateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<DropdownColumn[]>([{ ...ROOT_COLUMN }]);
  const [selectedPath, setSelectedPath] = useState<DropdownCategory[]>([]);
  const [tempSelectedPath, setTempSelectedPath] = useState<DropdownCategory[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [pendingCategory, setPendingCategory] = useState<DropdownCategory | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const {
    getRootCategories,
    getChildCategories,
    searchCategories,
    recentCategories,
    addToRecent,
    findCategoryById,
    isLoading: isLoadingTree,
  } = useCategoryTree();

  const debouncedGlobalSearch = useDebounce(globalSearchQuery, 300);
  const globalSearchQueryResult = useCategorySearchQuery(debouncedGlobalSearch, isOpen);

  const searchResults = useMemo(() => {
    const results = globalSearchQueryResult.data ?? [];
    if (results.length === 0) return [];
    return expandMatchesToLeaves(results, {
      getRoots: getRootCategories,
      getChildren: getChildCategories,
      findById: findCategoryById,
    });
  }, [globalSearchQueryResult.data, getRootCategories, getChildCategories, findCategoryById]);

  const resetDropdownState = useCallback(() => {
    setIsOpen(false);
    setColumns([{ ...ROOT_COLUMN }]);
    setSelectedPath([]);
    setTempSelectedPath([]);
    setGlobalSearchQuery('');
  }, []);

  const applyPathSelection = useCallback(
    (category: DropdownCategory) => {
      const byId = category.id ? findCategoryById(category.id) : undefined;
      let resolvedPath: DropdownCategory[];
      let resolvedOk = false;
      if (byId !== undefined) {
        resolvedPath = findNodeChain(byId, findCategoryById);
        resolvedOk = true;
      } else {
        const segments = splitPathSegments(category.path);
        const segResolved = resolvePathBySegments(segments, {
          getRoots: getRootCategories,
          getChildren: getChildCategories,
          findById: findCategoryById,
        });
        if (segments.length > 0 && segResolved.length === segments.length) {
          resolvedPath = segResolved;
          resolvedOk = true;
        } else if (isLoadingTree) {
          // Tree not ready — trust the caller for now; re-resolved on next open.
          resolvedPath = [category];
          resolvedOk = true;
        } else {
          // Unknown id and unresolvable path (stale recent/renamed): stage
          // nothing so Confirm stays disabled instead of committing a ghost.
          resolvedPath = [];
          resolvedOk = false;
        }
      }
      setSelectedPath(resolvedPath);
      const last = resolvedPath[resolvedPath.length - 1];
      const isLeaf = resolvedOk && resolvedPath.length > 0 && !last?.hasChildren;
      setTempSelectedPath(isLeaf ? resolvedPath : []);
      setColumns(buildColumnsForPath(resolvedPath));
    },
    [findCategoryById, getRootCategories, getChildCategories, isLoadingTree],
  );

  const commitSelection = useCallback(
    (category: DropdownCategory) => {
      applyPathSelection(category);
      addToRecent(category);
      onSelect?.(category);
      resetDropdownState();
    },
    [applyPathSelection, addToRecent, onSelect, resetDropdownState],
  );

  const requestCategorySelection = useCallback(
    (category: DropdownCategory) => {
      if (selectedCategory && selectedCategory.id !== category.id && isDirty) {
        setPendingCategory(category);
        setIsConfirmModalOpen(true);
      } else {
        commitSelection(category);
      }
    },
    [selectedCategory, isDirty, commitSelection],
  );

  const expandToCategory = useCallback(
    (category: DropdownCategory, columnIndex: number) => {
      const newPath = [...selectedPath.slice(0, columnIndex), category];
      // Don't wipe a staged leaf while merely exploring a sibling branch.
      const keepTemp =
        tempSelectedPath.length > newPath.length &&
        newPath.every((node, i) => tempSelectedPath[i]?.id === node.id);
      setSelectedPath(newPath);
      setTempSelectedPath(keepTemp ? tempSelectedPath : []);
      if (category.hasChildren) {
        setColumns((prev) => [
          ...prev.slice(0, columnIndex + 1),
          { parentId: category.id, parentName: category.name, searchQuery: '' },
        ]);
      }
    },
    [selectedPath, tempSelectedPath],
  );

  const handleCategoryClick = useCallback(
    (category: DropdownCategory, columnIndex: number) => {
      if (category.hasChildren) {
        expandToCategory(category, columnIndex);
        return;
      }
      const base = tempSelectedPath.length > columnIndex ? tempSelectedPath : selectedPath;
      setTempSelectedPath([...base.slice(0, columnIndex), category]);
    },
    [expandToCategory, selectedPath, tempSelectedPath],
  );

  const handleColumnSearch = useCallback((value: string, columnIndex: number) => {
    setColumns((prev) =>
      prev.map((column, index) =>
        index === columnIndex ? { ...column, searchQuery: value } : column,
      ),
    );
  }, []);

  const getCategoriesForColumn = useCallback(
    (column: DropdownColumn): DropdownCategory[] => {
      if (column.searchQuery) {
        return searchCategories(column.searchQuery, column.parentId || undefined);
      }
      return column.parentId ? getChildCategories(column.parentId) : getRootCategories();
    },
    [searchCategories, getChildCategories, getRootCategories],
  );

  const handleGlobalResultSelect = useCallback(
    (category: DropdownCategory) => {
      applyPathSelection(category);
      setGlobalSearchQuery('');
    },
    [applyPathSelection],
  );

  const handleRecentSelect = useCallback(
    (recent: RecentCategory) => {
      const segments = splitPathSegments(recent.path);
      const item: DropdownCategory = {
        id: recent.id,
        name: recent.name,
        parentCategory: null,
        hasChildren: false,
        level: Math.max(0, segments.length - 1),
        path: recent.path,
      };
      if (isOpen) {
        applyPathSelection(item);
      } else {
        // Closed-popover chips commit immediately — only for ids the tree knows.
        const known = item.id ? findCategoryById(item.id) : undefined;
        if (known || isLoadingTree) {
          requestCategorySelection(item);
        }
      }
    },
    [isOpen, applyPathSelection, requestCategorySelection, findCategoryById, isLoadingTree],
  );

  const handleConfirm = useCallback(() => {
    if (tempSelectedPath.length === 0) return;
    const finalCategory = tempSelectedPath[tempSelectedPath.length - 1];
    if (!finalCategory.hasChildren) {
      requestCategorySelection(finalCategory);
    }
  }, [tempSelectedPath, requestCategorySelection]);

  const handleConfirmModalProceed = useCallback(() => {
    if (pendingCategory) {
      commitSelection(pendingCategory);
      setPendingCategory(null);
    }
    setIsConfirmModalOpen(false);
  }, [pendingCategory, commitSelection]);

  const handleConfirmModalCancel = useCallback(() => {
    setPendingCategory(null);
    setIsConfirmModalOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open && selectedCategory) {
        applyPathSelection(selectedCategory);
      } else if (!open) {
        // Dismiss (outside-click/Esc) must not leak staged state into next open.
        setColumns([{ ...ROOT_COLUMN }]);
        setSelectedPath([]);
        setTempSelectedPath([]);
        setGlobalSearchQuery('');
      }
    },
    [selectedCategory, applyPathSelection],
  );

  const currentSelectionText =
    tempSelectedPath.length > 0 ? tempSelectedPath.map((cat) => cat.name).join(' > ') : '';
  const canConfirm =
    tempSelectedPath.length > 0 && !tempSelectedPath[tempSelectedPath.length - 1].hasChildren;

  return {
    isOpen,
    handleOpenChange,
    columns,
    handleColumnSearch,
    getCategoriesForColumn,
    selectedPath,
    tempSelectedPath,
    handleCategoryClick,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchResults,
    isSearching: globalSearchQueryResult.isFetching,
    recentCategories,
    handleRecentSelect,
    handleGlobalResultSelect,
    currentSelectionText,
    canConfirm,
    handleConfirm,
    resetDropdownState,
    pendingCategory,
    isConfirmModalOpen,
    handleConfirmModalProceed,
    handleConfirmModalCancel,
  };
}

export type CascadingDropdownState = ReturnType<typeof useCascadingDropdownState>;
