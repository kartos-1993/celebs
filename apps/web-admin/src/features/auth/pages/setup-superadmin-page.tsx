import { SetupSuperadminForm } from '../components/setup-superadmin-form';
import { SuperadminConfiguredCard } from '../components/superadmin-configured-card';
import { useSetupStatus } from '../hooks/use-auth-queries';

import { PageLoader } from '@/components/page-loader';

export function SetupSuperadminPage() {
  const { data, isLoading } = useSetupStatus();

  if (isLoading) {
    return <PageLoader />;
  }

  if (data?.data?.setupRequired === false) {
    return <SuperadminConfiguredCard />;
  }

  return (
    <div className="container relative grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">CELEBS</div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">Platform Initial Configuration Wizard</p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-left">
            <h1 className="text-2xl font-semibold tracking-tight">Setup Superadmin</h1>
            <p className="text-sm text-muted-foreground">
              Create the first super administrator user for this platform.
            </p>
          </div>
          <SetupSuperadminForm />
        </div>
      </div>
    </div>
  );
}

export default SetupSuperadminPage;
