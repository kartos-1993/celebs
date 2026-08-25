import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import PageLoader from '@/components/page-loader';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export default AuthLayout;
