import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const OptionSetsPage = lazy(() => import('./pages/option-sets-page'));

export const optionSetRoutes: RouteObject = {
  path: '/option-sets',
  element: <OptionSetsPage />,
  handle: { crumb: 'Option Sets' },
};
