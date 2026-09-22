import { matchRoutes } from 'react-router-dom';

import type { RouteMeta, SkeletonKind } from './landing-resolver';
import { routesConfig } from './routes-config';

/**
 * Single owner of "what silhouette this destination promises": resolves the
 * deepest matched route's declared `skeleton` handle. Works outside
 * RouterProvider (BootFallback) and inside it (AuthGuard, Suspense), so all
 * layers provably render the same answer. Absent declaration = neutral page.
 */
export function skeletonForPath(pathname: string): SkeletonKind {
  const matches = matchRoutes(routesConfig, pathname) ?? [];
  const skeleton = [...matches]
    .reverse()
    .map((match) => (match.route.handle as RouteMeta | undefined)?.skeleton)
    .find((kind): kind is SkeletonKind => kind !== undefined);
  return skeleton ?? 'page';
}
