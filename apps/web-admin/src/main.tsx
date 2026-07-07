// import { scan } from "react-scan"; // must be imported before React and React DOM
// import React from "react";

// scan({
//   enabled: true,
// });
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { router } from "./routes/router.tsx";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./context/theme-context.tsx";
import { AuthProvider } from "./context/auth-provider.tsx";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="theme">
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
