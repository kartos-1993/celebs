import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const ManageProduct = lazy(() => import('./components/manage-product'));
const AddProduct = lazy(() => import('./components/add-product'));
const MediaCenter = lazy(() => import('./media-center'));
const ReviewProductQueue = lazy(() => import('./components/review-product-queue'));

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
      element: <MediaCenter />,
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
