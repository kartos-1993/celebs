import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PanelsTopLeft } from 'lucide-react';
import { useAuthContext } from '@/context/auth-provider';
import PageLoader from '@/components/page-loader';

/**
 * VendorPortalLayout — Minimal layout for vendors not yet approved.
 * Used for: onboarding wizard, under-review screen, rejected screen.
 * No sidebar, no full nav — clean, focused experience.
 */
export const VendorPortalLayout = () => {
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header — logo + vendor name only */}
      <header className="h-14 border-b bg-card flex items-center px-6 gap-3 shrink-0">
        <PanelsTopLeft className="w-5 h-5 text-primary" />
        <span className="font-bold text-base">Celebs Seller Center</span>
        {user?.name && (
          <span className="ml-auto text-sm text-muted-foreground">
            {user.name}
          </span>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-2xl">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default VendorPortalLayout;
