import React from 'react';
import { Link } from 'react-router-dom';

import { useSetupStatus } from '../hooks/use-auth-queries';

export const SetupRequiredBanner: React.FC = () => {
  const { data } = useSetupStatus();

  const setupRequired = data?.data?.setupRequired;

  if (!setupRequired) return null;

  return (
    <div className="mb-2 flex flex-col gap-1 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
      <span className="font-semibold">Initial Setup Required</span>
      <span>No administrator account exists yet. Create the initial platform admin.</span>
      <Link
        to="/setup-superadmin"
        className="mt-1 font-medium underline underline-offset-4 hover:text-foreground"
      >
        Setup Superadmin →
      </Link>
    </div>
  );
};
