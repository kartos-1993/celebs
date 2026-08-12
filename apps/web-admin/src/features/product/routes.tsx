import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const ManageProductPage = lazy(() => import('./pages/manage-product-page'));
const AddProductPage = lazy(() => import('./pages/add-product-page'));
const MediaCenterPage = lazy(() => import('./pages/media-center-page'));
const ReviewProductQueuePage = lazy(() => import('./pages/review-product-queue-page'));

/**
 * Guard policy:
 *  - vendor-facing CRUD is role-gated; fine-grained permission checks
 *    (PRODUCT_EDIT etc.) are enforced server-side, and the sidebar already
 *    hides entries by permission
 *  - review queue is strictly ADMIN/SUPERADMIN
 */
export const productRoutes: RouteObject = {
  path: 'products',
  handle: { crumb: 'Products' },
  children: [
    { index: true, element: <Navigate to="manage" replace /> },
    {
      path: 'manage',
      element: (
        <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN', 'STAFF']}>
          <ManageProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Manage Product' },
    },
    {
      path: 'new',
      element: (
        <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN']}>
          <AddProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Add Product' },
    },
    {
      // Was missing — "Edit" links pointed to /products/edit/:id → 404
      path: 'edit/:id',
      element: (
        <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN']}>
          <AddProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Edit Product' },
    },
    {
      path: 'mediacenter',
      element: (
        <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN', 'STAFF']}>
          <MediaCenterPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Media Center' },
    },
    {
      path: 'review-product-queue',
      element: (
        <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
          <ReviewProductQueuePage />
        </RoleGuard>
      ),
      handle: { crumb: 'Review Product Queue' },
    },
  ],
};
