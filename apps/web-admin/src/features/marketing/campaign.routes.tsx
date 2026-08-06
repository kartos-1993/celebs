import { RouteObject } from 'react-router-dom';
import { CampaignListPage } from './pages/campaign-list-page';
import { CampaignFormPage } from './pages/campaign-form-page';

export const campaignRoutes: RouteObject = {
  path: 'marketing/campaigns',
  children: [
    {
      path: '',
      element: <CampaignListPage />,
      handle: { title: 'Festival Campaigns', crumb: 'Campaigns' },
    },
    {
      path: 'new',
      element: <CampaignFormPage />,
      handle: { title: 'Create Campaign', crumb: 'New Campaign' },
    },
    {
      path: ':id',
      element: <CampaignFormPage />,
      handle: { title: 'Edit Campaign', crumb: 'Edit Campaign' },
    },
  ],
};
