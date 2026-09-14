import type { DropdownCategory } from '@celebs/shared-types';

import type { DropdownColumn } from '../types';

export function formatCategoryPath(path: string[] | string | undefined | null): string {
  if (!path) return '';
  if (Array.isArray(path)) return path.join(' > ');
  if (typeof path === 'string') return path.split('/').join(' > ');
  return String(path);
}

export function splitPathSegments(path: string[] | string | undefined | null): string[] {
  if (!path) return [];
  if (Array.isArray(path)) return path;
  if (typeof path === 'string') return path.split('/');
  return [];
}

/** Collect every leaf descendant below a parent id (depth-first). */
export function collectLeafDescendants(
  parentId: string,
  getChildren: (parentId: string) => DropdownCategory[],
): DropdownCategory[] {
  const result: DropdownCategory[] = [];
  const visit = (node: DropdownCategory) => {
    const kids = getChildren(node.id);
    if (!kids || kids.length === 0) {
      result.push(node);
    } else {
      for (const kid of kids) visit(kid);
    }
  };
  getChildren(parentId).forEach(visit);
  return result;
}

interface TreeAccessors {
  getRoots: () => DropdownCategory[];
  getChildren: (parentId: string) => DropdownCategory[];
  findById: (id: string) => DropdownCategory | undefined;
}

/** Resolve path segments (names or slugs) against the local tree. */
export function resolvePathBySegments(
  segments: string[],
  { getRoots, getChildren }: TreeAccessors,
): DropdownCategory[] {
  const resolved: DropdownCategory[] = [];
  let parentId: string | null = null;
  for (const name of segments) {
    const candidates: DropdownCategory[] = parentId === null ? getRoots() : getChildren(parentId);
    const match: DropdownCategory | undefined = candidates.find(
      (c: DropdownCategory) => c.name === name || c.slug === name,
    );
    if (!match) break;
    resolved.push(match);
    parentId = match.id;
  }
  return resolved;
}

/** Walk up via parentCategory to build the full root-to-node chain. */
export function findNodeChain(
  node: DropdownCategory,
  findById: (id: string) => DropdownCategory | undefined,
): DropdownCategory[] {
  const chain: DropdownCategory[] = [];
  let current: DropdownCategory | undefined = node;
  while (current) {
    chain.unshift(current);
    current = current.parentCategory ? findById(current.parentCategory) : undefined;
  }
  return chain;
}

/** Expand server matches to selectable leaves (parents fan out to leaves). */
export function expandMatchesToLeaves(
  results: DropdownCategory[],
  { getChildren, findById }: TreeAccessors,
): DropdownCategory[] {
  const leaves: DropdownCategory[] = [];
  for (const result of results) {
    const local = result.id ? findById(result.id) : undefined;
    if (!local) continue;
    const children = getChildren(local.id);
    if (!children || children.length === 0) {
      leaves.push(local);
    } else {
      leaves.push(...collectLeafDescendants(local.id, getChildren));
    }
  }
  return Array.from(new Map(leaves.map((c) => [c.id, c])).values());
}

export const ROOT_COLUMN: DropdownColumn = {
  parentId: null,
  parentName: 'Categories',
  searchQuery: '',
};

/** Build the cascade columns that reveal a root-to-node path. */
export function buildColumnsForPath(path: DropdownCategory[]): DropdownColumn[] {
  const columns: DropdownColumn[] = [{ ...ROOT_COLUMN }];
  for (let i = 0; i < path.length; i += 1) {
    const node = path[i];
    const isLast = i === path.length - 1;
    if (!isLast || node.hasChildren) {
      columns.push({ parentId: node.id, parentName: node.name, searchQuery: '' });
    }
  }
  return columns;
}
