import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle,Home, ShieldAlert } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { PATHS } from '@/routes/paths';

interface ForbiddenLocationState {
  from?: string;
  requiredPermissions?: string | string[];
  allowedRoles?: string[];
  userRole?: string;
}

export default function ForbiddenError() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ForbiddenLocationState | undefined;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(PATHS.DASHBOARD);
    }
  };

  const formattedPermissions = Array.isArray(state?.requiredPermissions)
    ? state?.requiredPermissions.join(', ')
    : state?.requiredPermissions;

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-6 text-center">
      {/* Visual Badge */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">403 - Access Denied</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        You do not have the required permissions to access this module or perform this action.
      </p>

      {/* Diagnostic Context Box */}
      {state && (formattedPermissions || state.from || state.allowedRoles) && (
        <div className="mt-6 w-full max-w-md rounded-lg border border-border/60 bg-muted/30 p-4 text-left text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1.5">Access Diagnostics:</p>
          {state.from && (
            <div className="flex justify-between py-0.5">
              <span>Attempted Route:</span>
              <code className="font-mono text-foreground">{state.from}</code>
            </div>
          )}
          {formattedPermissions && (
            <div className="flex justify-between py-0.5">
              <span>Required Permission:</span>
              <code className="font-mono text-foreground">{formattedPermissions}</code>
            </div>
          )}
          {state.allowedRoles && (
            <div className="flex justify-between py-0.5">
              <span>Allowed Roles:</span>
              <span className="font-medium text-foreground">{state.allowedRoles.join(', ')}</span>
            </div>
          )}
          {state.userRole && (
            <div className="flex justify-between py-0.5">
              <span>Your Role:</span>
              <span className="font-medium text-foreground">{state.userRole}</span>
            </div>
          )}
        </div>
      )}

      {/* Actionable Recovery Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={handleGoBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <Button asChild className="gap-2">
          <Link to={PATHS.DASHBOARD}>
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Button variant="ghost" asChild className="gap-2 text-muted-foreground">
          <a
            href="mailto:admin-support@celebs.com?subject=Permission%20Access%20Request"
            target="_blank"
            rel="noreferrer"
          >
            <HelpCircle className="h-4 w-4" />
            Request Access
          </a>
        </Button>
      </div>
    </div>
  );
}
