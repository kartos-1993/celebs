import { RouteObject } from 'react-router-dom';
import { ComboListPage } from './pages/combo-list-page';
import { ComboFormPage } from './pages/combo-form-page';

export const comboRoutes: RouteObject = {
  path: 'marketing/combos',
  children: [
    {
      path: '',
      element: <ComboListPage />,
      handle: { title: 'Generic Combo Bundles', crumb: 'Combos' },
    },
    {
      path: 'new',
      element: <ComboFormPage />,
      handle: { title: 'Create Combo Bundle', crumb: 'New Combo' },
    },
    {
      path: ':id',
      element: <ComboFormPage />,
      handle: { title: 'Edit Combo Bundle', crumb: 'Edit Combo' },
    },
  ],
};
