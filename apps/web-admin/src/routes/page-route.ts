import type { ComponentType, ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';

/**
 * Defers a default-exported page to the router's lazy loader so its chunk
 * downloads in parallel with the session fetch instead of after auth.
 * The module-to-Component translation lives here once, keeping every
 * routes file to a one-line spread.
 */
export function pageRoute(
  load: () => Promise<{ default: ComponentType }>,
  wrap?: (Page: ComponentType) => ReactNode,
): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => {
      const module = await load();
      const Page = module.default;
      return { Component: wrap ? () => wrap(Page) : Page };
    },
  };
}
