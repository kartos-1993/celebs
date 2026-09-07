import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

export const SuperadminConfiguredCard: React.FC = () => {
  return (
    <div className="flex h-svh flex-col items-center justify-center p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-success/10 p-3 text-success">
          <CheckCircle aria-hidden="true" className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Superadmin Already Configured</h1>
        <p className="text-sm text-muted-foreground">
          A platform administrator already exists. Initial setup is closed.
        </p>
        <Button asChild className="w-full">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
};
