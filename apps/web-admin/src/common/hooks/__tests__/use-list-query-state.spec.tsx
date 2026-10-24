import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useListQueryState } from '../use-list-query-state';

describe('useListQueryState URL synchronization & flicker prevention', () => {
  const allowedTabs = ['all', 'draft', 'pending_review', 'published', 'rejected'] as const;
  const allowedSorts = ['newest', 'oldest'] as const;

  const wrapper =
    (initialEntries: string[] = ['/admin/products']) =>
    ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );

  it('initializes with defaultTab when no tab param is in the URL', () => {
    const { result } = renderHook(
      () =>
        useListQueryState({
          defaultTab: 'all',
          allowedTabs,
          defaultSort: 'newest',
          allowedSorts,
        }),
      { wrapper: wrapper(['/admin/products']) },
    );

    expect(result.current.tab).toBe('all');
    expect(result.current.page).toBe(1);
  });

  it('retains selected tab when setTab is called without flickering back', () => {
    const { result } = renderHook(
      () => {
        const state = useListQueryState({
          defaultTab: 'all',
          allowedTabs,
          defaultSort: 'newest',
          allowedSorts,
        });
        const location = useLocation();
        return { state, location };
      },
      { wrapper: wrapper(['/admin/products?page=3']) },
    );

    expect(result.current.state.tab).toBe('all');
    expect(result.current.state.page).toBe(3);

    act(() => {
      result.current.state.setTab('draft');
    });

    expect(result.current.state.tab).toBe('draft');
    expect(result.current.state.page).toBe(1);
    expect(result.current.location.search).toContain('tab=draft');
    expect(result.current.location.search).not.toContain('page=');
  });

  it('prevents stale closure overwrite when setTab and setPage are called consecutively in the same tick', () => {
    const { result } = renderHook(
      () => {
        const state = useListQueryState({
          defaultTab: 'all',
          allowedTabs,
          defaultSort: 'newest',
          allowedSorts,
        });
        const location = useLocation();
        return { state, location };
      },
      { wrapper: wrapper(['/admin/products']) },
    );

    act(() => {
      // Simulates the exact user bug: setTab followed immediately by setPage
      result.current.state.setTab('rejected');
      result.current.state.setPage(1);
    });

    expect(result.current.state.tab).toBe('rejected');
    expect(result.current.location.search).toContain('tab=rejected');
  });

  it('resets page to 1 automatically when extra filters change', () => {
    const { result } = renderHook(
      () => {
        const state = useListQueryState({
          defaultTab: 'all',
          allowedTabs,
          defaultSort: 'newest',
          allowedSorts,
          extraKeys: ['vendor', 'category'],
        });
        const location = useLocation();
        return { state, location };
      },
      { wrapper: wrapper(['/admin/products?page=4']) },
    );

    expect(result.current.state.page).toBe(4);

    act(() => {
      result.current.state.setExtra('vendor', 'v-123');
    });

    expect(result.current.state.page).toBe(1);
    expect(result.current.state.extras.vendor).toBe('v-123');
    expect(result.current.location.search).toContain('vendor=v-123');
    expect(result.current.location.search).not.toContain('page=');
  });
});
