import { Navigate, type RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const productRoutes: RouteObject = {
  path: 'products',
  handle: { crumb: 'Products' },
  children: [
    { index: true, element: <Navigate to="manage" replace /> },
    {
      path: 'manage',
      ...pageRoute(
        () => import('./pages/manage-product-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Manage Product' },
    },
    {
      path: 'new',
      ...pageRoute(
        () => import('./pages/add-product-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_CREATE}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Add Product' },
    },
    {
      path: 'edit/:id',
      ...pageRoute(
        () => import('./pages/add-product-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_EDIT}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Edit Product' },
    },
    {
      path: 'mediacenter',
      ...pageRoute(
        () => import('./pages/media-center-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Media Center' },
    },
    {
      path: 'brand-authorizations',
      ...pageRoute(
        () => import('./pages/brand-authorizations-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_CREATE}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Brand Authorizations' },
    },
    {
      path: 'review-product-queue',
      ...pageRoute(
        () => import('./pages/review-product-queue-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_REVIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Review Product Queue' },
    },
  ],
};
