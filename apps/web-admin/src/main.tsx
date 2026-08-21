// import { scan } from "react-scan"; // must be imported before React and React DOM
// import React from "react";

// scan({
//   enabled: true,
// });
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { router } from '@/routes/router';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/context/theme-provider';
import { QueryClientProvider, QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { AuthProvider } from '@/context/auth-provider';
import { showErrorToast } from '@/lib/error-utils';
import { Toaster } from '@/components/toaster';

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
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
