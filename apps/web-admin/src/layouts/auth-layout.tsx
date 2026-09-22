import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Public routes render nothing while the chunk loads — no skeleton. */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export default AuthLayout;
