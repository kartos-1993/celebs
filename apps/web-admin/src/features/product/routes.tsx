import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const ManageProduct = lazy(() => import('./pages/manage-product-page'));
const AddProduct = lazy(() => import('./pages/add-product-page'));
const MediaCenterPage = lazy(() => import('./pages/media-center-page'));
const ReviewProductQueue = lazy(() => import('./pages/review-product-queue-page'));

export const productRoutes: RouteObject = {
  path: 'products',
  handle: { crumb: 'Products' },
  children: [
    {
      path: 'manage',
      element: <ManageProduct />,
      handle: { crumb: 'Manage Product' },
    },
    {
      path: 'new',
      element: <AddProduct />,
      handle: { crumb: 'Add Product' },
    },
    {
      path: 'mediacenter',
      element: <MediaCenterPage />,
      handle: { crumb: 'Media Center' },
    },
    {
      path: 'review-product-queue',
      element: (
        <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
          <ReviewProductQueue />
        </RoleGuard>
      ),
      handle: { crumb: 'Review Product Queue' },
    },
  ],
};
