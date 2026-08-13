import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const ManageProductPage = lazy(() => import('./pages/manage-product-page'));
const AddProductPage = lazy(() => import('./pages/add-product-page'));
const MediaCenterPage = lazy(() => import('./pages/media-center-page'));
const ReviewProductQueuePage = lazy(() => import('./pages/review-product-queue-page'));

export const productRoutes: RouteObject = {
  path: 'products',
  handle: { crumb: 'Products' },
  children: [
    { index: true, element: <Navigate to="manage" replace /> },
    {
      path: 'manage',
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
          <ManageProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Manage Product' },
    },
    {
      path: 'new',
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_CREATE}>
          <AddProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Add Product' },
    },
    {
      path: 'edit/:id',
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_EDIT}>
          <AddProductPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Edit Product' },
    },
    {
      path: 'mediacenter',
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
          <MediaCenterPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Media Center' },
    },
    {
      path: 'review-product-queue',
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_REVIEW}>
          <ReviewProductQueuePage />
        </RoleGuard>
      ),
      handle: { crumb: 'Review Product Queue' },
    },
  ],
};
