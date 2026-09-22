// import { scan } from "react-scan"; // must be imported before React and React DOM
// import React from "react";

// scan({
//   enabled: true,
// });
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';

import { PageSkeleton } from '@/components/page-skeleton';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/context/auth-provider';
import { ThemeProvider } from '@/context/theme-provider';
import { showErrorToast } from '@/lib/error-utils';
import { BootFallback } from '@/routes/boot-fallback';
import { router } from '@/routes/router';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query?.meta?.suppressErrorToast) return;
      showErrorToast(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation?.meta?.suppressErrorToast) return;
      showErrorToast(error);
    },
  }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="theme">
        <AuthProvider>
          {/* Post-init safety net for lazy routes with no layout boundary
              (verify-email, standalone errors). Layout-owned routes resolve
              through their nearer Suspense first. */}
          <Suspense fallback={<PageSkeleton />}>
            <RouterProvider router={router} fallbackElement={<BootFallback />} />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
