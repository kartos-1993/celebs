import { describe, expect, it } from 'vitest';

import productRoutes from '../product.routes';

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

describe('productRoutes — canonical REST catalog route definitions', () => {
  it('registers canonical product creation POST route on base path', () => {
    const layers = productRoutes.stack as unknown as RouteLayer[];
    const postRoute = layers.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.post,
    );

    expect(postRoute).toBeDefined();
    expect(postRoute?.route?.methods?.post).toBe(true);
  });

  it('registers canonical product mutation routes (PUT, PATCH, DELETE, SUBMIT)', () => {
    const layers = productRoutes.stack as unknown as RouteLayer[];
    const registeredRoutes = layers
      .filter((layer): layer is Required<RouteLayer> => Boolean(layer.route))
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(registeredRoutes).toContainEqual({
      path: '/:id',
      methods: expect.arrayContaining(['put']),
    });

    expect(registeredRoutes).toContainEqual({
      path: '/:id',
      methods: expect.arrayContaining(['patch']),
    });

    expect(registeredRoutes).toContainEqual({
      path: '/:id',
      methods: expect.arrayContaining(['delete']),
    });

    expect(registeredRoutes).toContainEqual({
      path: '/:id/submit-for-review',
      methods: expect.arrayContaining(['post']),
    });
  });
});
