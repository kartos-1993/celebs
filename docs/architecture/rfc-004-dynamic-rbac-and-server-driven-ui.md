# RFC-004: Dynamic RBAC, Platform Configuration & Server-Driven UI (SDUI) Architecture

**Status**: Proposed / Approved  
**Authors**: Celebs Core Architecture Team  
**Scope**: `apps/api`, `apps/web-admin`, `apps/mobile`, `packages/rbac`, `packages/shared-types`, Database  

---

## 1. Executive Summary & Problem Statement

As the `celebs` platform scales from early marketplace testing into an enterprise multi-vendor ecosystem (comparable to Daraz, Shein, and Amazon), four architectural challenges must be resolved without accumulating technical debt:

1. **Context & Actor Resolution Discrepancies**:
   - Platform Administrators (1P) operating without a seller store context must not trigger `SELLER_CONTEXT_REQUIRED` on vendor-specific surfaces.
   - Access control must distinguish between **Actor Capabilities (Permissions)** and **Commercial Scopes (Store vs. Platform)**.
2. **Elimination of Hardcoded Role Checks (Dynamic RBAC)**:
   - Hardcoding `if (role === 'VENDOR')` or `if (role === 'SUPERADMIN')` across UI components breaks sub-accounts (Staff), prevents custom role delegation, and violates the Open-Closed Principle (OCP).
   - Frontend and backend must dynamically evaluate permissions using a unified `@celebs/rbac` contract.
3. **Elimination of Environment Variable Feature Flag Debt**:
   - Relying on `.env` toggles requires full CI/CD redeployments, lacks an audit trail, blocks non-technical operations teams from managing campaigns, and creates dead "zombie code".
   - Runtime toggles must be backed by a cached Database Platform Configuration engine.
4. **Server-Driven UI (SDUI) & Decoupled Component Registry**:
   - Hardcoding layouts in client screens creates App Store release bottlenecks (2–4 day review delays) and prevents dynamic admin-controlled merchandising.
   - Marketing campaigns, festival sales, and flash promotions must be dynamically configurable in real time via a decoupled widget registry without switch statements or client code changes.

---

## 2. Dynamic RBAC Architecture (The Daraz / Amazon Model)

### 2.1 The 3-Tier Entity Hierarchy

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      PLATFORM LAYER (Celebs 1P)                        │
 │  • Roles: SUPERADMIN, ADMIN                                            │
 │  • Scope: Platform-wide, StoreContext = null                           │
 │  • Capabilities: Full catalog governance, KYC audit, Platform Settings │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      STORE / VENDOR LAYER (3P)                         │
 │  • Role: VENDOR (Master Account / Legal Store Owner)                   │
 │  • Scope: StoreContext = { id: vendorProfile.id, isOwner: true }       │
 │  • Capabilities: Master store management, Bank/Payouts, Staff invites  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      STAFF SUB-ACCOUNT LAYER                           │
 │  • Role: STAFF (Delegated Sub-Users)                                   │
 │  • Scope: StoreContext = { id: user.vendorId, isOwner: false }         │
 │  • Capabilities: Granular custom permissions granted by Store Master   │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Permissions as Single Source of Truth (`@celebs/rbac`)

Permissions are modeled as granular actions in [`packages/rbac`](file:///c:/celebs/celebs/packages/rbac):

- **Catalog & Products**: `product:view`, `product:create`, `product:edit`, `product:delete`, `product:publish`, `product:review`
- **Taxonomy & Brands**: `catalog:view`, `catalog:manage`, `brand:view`, `brand:manage`
- **Orders & Operations**: `order:view`, `order:manage`
- **Finance & Settlements**: `finance:view`, `finance:manage`
- **Team & Sub-Accounts**: `staff:view`, `staff:manage`
- **Platform Governance**: `user:view`, `user:manage`, `vendor:view`, `vendor:manage`, `platform:manage`

---

### 2.3 Unified Permission Contract (`Permission | Permission[]`)

To eliminate API ambiguity and avoid redundant props (`requiredPermission` vs `requiredPermissions`), access control across all hooks, guards, and components uses a single polymorphic signature:

```typescript
// packages/rbac/src/types.ts
export type PermissionRequirement = Permission | Permission[];
export type PermissionMode = 'ANY' | 'ALL';
```

```typescript
// packages/rbac/src/can.ts
import { Role, ROLE_PERMISSIONS } from './role-permissions';
import { Permission } from './permissions';
import type { PermissionRequirement, PermissionMode } from './types';

export function getUserPermissions(
  role: Role | string,
  userCustomPermissions?: string[],
): Permission[] {
  if (role === 'SUPERADMIN') {
    return Object.values(Permission);
  }

  const defaultRolePermissions = ROLE_PERMISSIONS[role as Role] ?? [];

  if (userCustomPermissions && Array.isArray(userCustomPermissions) && userCustomPermissions.length > 0) {
    const combined = new Set<string>([...defaultRolePermissions, ...userCustomPermissions]);
    return Array.from(combined) as Permission[];
  }

  return [...defaultRolePermissions];
}

export function can(
  role: Role | string,
  permission: Permission,
  userCustomPermissions?: string[],
): boolean {
  if (role === 'SUPERADMIN') return true;
  const effectivePermissions = getUserPermissions(role, userCustomPermissions);
  return effectivePermissions.includes(permission);
}

export function hasPermissionAccess(
  role: Role | string,
  userCustomPermissions: string[] | undefined,
  required: PermissionRequirement | undefined,
  mode: PermissionMode = 'ANY'
): boolean {
  if (!required) return true;
  if (role === 'SUPERADMIN') return true;

  const perms = Array.isArray(required) ? required : [required];
  if (perms.length === 0) return true;

  if (mode === 'ALL') {
    return perms.every((perm) => can(role, perm, userCustomPermissions));
  }

  return perms.some((perm) => can(role, perm, userCustomPermissions));
}
```

---

### 2.4 Frontend Dynamic RBAC Integration (`apps/web-admin`)

#### 1. Dynamic Permission Hook (`usePermission`)

```typescript
// apps/web-admin/src/hooks/use-permission.ts
import { useAuthContext } from '@/context/auth-provider';
import { hasPermissionAccess, type PermissionRequirement, type PermissionMode } from '@celebs/rbac';

export function usePermission(
  required?: PermissionRequirement,
  mode: PermissionMode = 'ANY'
): boolean {
  const { user } = useAuthContext();
  if (!user) return false;
  return hasPermissionAccess(user.role, user.permissions, required, mode);
}
```

#### 2. Declarative Component Gating (`<Can />` with Disable UX)

High-intent actions (e.g. "Publish Product", "Disburse Payout") support `mode="disable"` with accessible tooltips rather than vanishing from the UI:

```tsx
// apps/web-admin/src/components/can.tsx
import React from 'react';
import { usePermission } from '@/hooks/use-permission';
import type { PermissionRequirement, PermissionMode } from '@celebs/rbac';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

interface CanProps {
  permissions: PermissionRequirement;
  mode?: 'hide' | 'disable';
  permissionMode?: PermissionMode;
  disabledTooltip?: string;
  fallback?: React.ReactNode;
  children: React.ReactElement;
}

export const Can: React.FC<CanProps> = ({
  permissions,
  mode = 'hide',
  permissionMode = 'ANY',
  disabledTooltip = 'You do not have permission to perform this action',
  fallback = null,
  children,
}) => {
  const isAllowed = usePermission(permissions, permissionMode);

  if (isAllowed) return children;
  if (mode === 'hide') return <>{fallback}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">
            {React.cloneElement(children, {
              disabled: true,
              className: `${children.props.className ?? ''} pointer-events-none opacity-50`,
              'aria-disabled': true,
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### 3. Declarative Route Guarding (`<RoleGuard />`)

`<RoleGuard />` enforces granular permissions on route trees. When access is denied, it performs a **context-preserving redirection** to `/403` by attaching the attempted path, required permissions, and user role inside React Router's `location.state`. This prevents dead-end error pages and enables the 403 view to show exact diagnostic details and recovery routes.

```tsx
// apps/web-admin/src/routes/role-guard.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/auth-provider';
import { hasPermissionAccess, type PermissionRequirement, type PermissionMode } from '@celebs/rbac';
import PageLoader from '@/components/page-loader';

interface RoleGuardProps {
  children: React.ReactNode;
  permissions?: PermissionRequirement;
  permissionMode?: PermissionMode;
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  permissions,
  permissionMode = 'ANY',
  fallbackPath = '/403',
}) => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAllowed = hasPermissionAccess(user.role, user.permissions, permissions, permissionMode);

  if (!isAllowed) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location.pathname,
          requiredPermissions: permissions,
          userRole: user.role,
        }}
      />
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
```

---

## 3. Web-Admin Frontend Operational & UI Edge Cases

### 3.1 Declarative Route Manifest & Dynamic Navigation Tree

#### The Anti-Pattern: Hardcoded Switch / If-Else Navigation
Writing imperative `if (hasPerm(Permission.XYZ)) list.push(...)` in `menu-data.ts` or sequential fallback branches in a landing resolver violates OCP and causes out-of-sync navigation bugs.

#### The Enterprise Pattern: Manifest-Driven Navigation & Landing Resolver

Each feature exports route objects with typed `handle` metadata:

```typescript
// apps/web-admin/src/routes/types.ts
import type { PermissionRequirement, PermissionMode } from '@celebs/rbac';
import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router-dom';

export interface RouteMeta {
  title?: string;
  crumb?: string;
  icon?: LucideIcon;
  navGroup?: string;
  landingPriority?: number; // Lower number = higher priority for landing route
  hideFromNav?: boolean;
  permissions?: PermissionRequirement;
  permissionMode?: PermissionMode;
}

export type AppRouteObject = RouteObject & {
  handle?: RouteMeta;
  children?: AppRouteObject[];
};
```

#### Pure, Zero-Hardcoded Landing Resolver
```typescript
// apps/web-admin/src/routes/landing-resolver.ts
import { hasPermissionAccess } from '@celebs/rbac';
import type { UserData } from '@celebs/shared-types';
import type { AppRouteObject } from './types';

interface FlatNavCandidate {
  fullPath: string;
  priority: number;
}

export function resolveDefaultLandingRoute(
  routes: AppRouteObject[],
  user: UserData,
  basePath = ''
): string {
  const candidates: FlatNavCandidate[] = [];

  function traverse(nodeList: AppRouteObject[], currentPath: string) {
    for (const node of nodeList) {
      const segment = node.path ? (node.path.startsWith('/') ? node.path : `/${node.path}`) : '';
      const fullPath = node.index ? currentPath : `${currentPath}${segment}`.replace(/\/+/g, '/');
      const meta = node.handle;

      const isAllowed = hasPermissionAccess(
        user.role,
        user.permissions,
        meta?.permissions,
        meta?.permissionMode
      );

      if (!isAllowed) continue;

      if (!meta?.hideFromNav && (node.index || (!node.children && node.element))) {
        candidates.push({
          fullPath,
          priority: meta?.landingPriority ?? 999,
        });
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children, fullPath);
      }
    }
  }

  traverse(routes, basePath);
  candidates.sort((a, b) => a.priority - b.priority);

  return candidates[0]?.fullPath || '/account/profile';
}
```

---

### 3.2 Data Tables: Dynamic Column Pruning & Memoization

In TanStack Table (`@tanstack/react-table`), wrapping action cells in `<Can>` without filtering column headers produces empty table columns.

**Mandate**: Dynamically prune unauthorized column definitions inside `useMemo` before passing to `useReactTable`:

```tsx
// apps/web-admin/src/features/product/components/manage-product-table.tsx
const canEdit = usePermission(Permission.PRODUCT_EDIT);
const canDelete = usePermission(Permission.PRODUCT_DELETE);

const columns = useMemo<ColumnDef<ProductData>[]>(() => {
  const cols: ColumnDef<ProductData>[] = [
    // ...standard data columns
  ];

  if (canEdit || canDelete) {
    cols.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <ProductRowActions product={row.original} canEdit={canEdit} canDelete={canDelete} />
      ),
    });
  }

  return cols;
}, [canEdit, canDelete]);
```

---

### 3.3 Dynamic Forms: Privileged Field Gating & Zod Desynchronization

When privileged fields (e.g. `isApproved`, `commissionRate`, `directPublish`) are gated by `<Can>` in React Hook Form:
1. Privileged fields in base schemas must be `.optional()` in `@celebs/shared-types`.
2. Do not enable `shouldUnregister: true` globally, as it wipes existing server-persisted data on submit for fields that the current user cannot see.

---

### 3.4 1P Superadmin Context Switching & Target Vendor Selector

Platform Administrators (Superadmin/Admin) have platform-wide permissions but lack an implicit `vendorId`.
- **Form Rule**: On vendor-scoped creation forms (e.g. `AddProductPage`, `CreateComboPage`), if `user.role === 'SUPERADMIN' || user.role === 'ADMIN'`, the form must render a mandatory searchable **"Target Vendor Selector"** before allowing submission.

---

### 3.5 Mid-Session Revocation, 403 Handling & Deterministic Rollback

When a store master revokes permissions from an active staff user:
1. **Axios 403 Interception**: If an API request returns `403 FORBIDDEN` with `PERMISSION_DENIED`, trigger a session refresh (`authContext.refetch()`).
2. **TanStack Query Deterministic Rollback**: All optimistic mutations must implement `onError` to restore the previous snapshot from context.

```typescript
// apps/web-admin/src/features/product/hooks/use-delete-product.ts
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refetch: refetchAuth } = useAuthContext();

  return useMutation({
    mutationFn: (productId: string) => ProductApiService.deleteProduct(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      const previous = queryClient.getQueryData(PRODUCT_QUERY_KEYS.lists());

      queryClient.setQueryData(PRODUCT_QUERY_KEYS.lists(), (old: any) => ({
        ...old,
        products: old.products.filter((p: any) => p.id !== productId),
      }));

      return { previous };
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PRODUCT_QUERY_KEYS.lists(), context.previous);
      }
      if (err?.response?.status === 403) {
        toast({
          variant: 'destructive',
          title: 'Permission Revoked',
          description: 'Your staff account permissions have been updated. Refreshing state...',
        });
        refetchAuth();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
    },
  });
}
```

---

### 3.6 403 Forbidden UX Architecture: Context Preservation, Shell Retention & Recovery Flows

#### The Problem: Dead-End Redirection & UX Traps
Redirecting unauthorized users to a bare `/403` string or generic error view introduces severe usability issues:
1. **Zero Diagnostic Context**: Users (especially Staff with partial permissions) cannot determine which permission was missing or why they were blocked.
2. **Dead-End Experience**: Users are stranded with no recovery actions (no "Go Back", "Back to Dashboard", or "Request Access" buttons).
3. **Shell Loss Disorientation**: If rendered outside `AdminLayout`, the user loses the navigation sidebar and top header, breaking the flow of work.

#### The Enterprise Pattern: Context-Aware 403 Page with Recovery Tri-Actions

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 1. RoleGuard Interception & State Injection                            │
 │    Navigate to /403 with `state: { from, requiredPermissions, role }`  │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 2. In-Shell Rendering (Inside AdminLayout)                             │
 │    Sidebar and Top Navbar remain functional and accessible.            │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 3. Actionable Recovery Controls                                        │
 │    [ ← Go Back ]  [ ⌂ Back to Dashboard ]  [ ✉ Request Access ]        │
 └────────────────────────────────────────────────────────────────────────┘
```

#### 1. Dedicated `ForbiddenError` Component

```tsx
// apps/web-admin/src/features/errors/forbidden-error.tsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, HelpCircle } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';
import { PATHS } from '@/routes/paths';

interface ForbiddenLocationState {
  from?: string;
  requiredPermissions?: string | string[];
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
      {state && (formattedPermissions || state.from) && (
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
```

#### 2. Dual Shell Route Registration

To ensure users retain full navigation shell capabilities while also supporting standalone deep-links, register `ForbiddenError` inside `AdminLayout` as well as at top-level fallback:

```tsx
// apps/web-admin/src/routes/routes-config.tsx
const ForbiddenError = lazy(() => import('@/features/errors/forbidden-error'));

export const routesConfig: RouteObject[] = [
  // ── Full Admin App (in-shell 403 preserves sidebar & navbar) ─────────────
  {
    path: PATHS.DASHBOARD,
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      productRoutes,
      categoryRoutes,
      // ...other feature routes
      {
        path: '403',
        element: <ForbiddenError />,
        handle: { crumb: 'Access Denied' },
      },
    ],
  },
  // ── Top-level 403 & 404 fallbacks ─────────────────────────────────────────
  {
    path: PATHS.ERRORS.FORBIDDEN,
    element: <ForbiddenError />,
  },
  {
    path: '*',
    element: <NotFoundError />,
  },
];
```

---

## 4. Server-Driven UI (SDUI) & Decoupled Layout Engine

### 4.1 Decoupled Component Registry Pattern

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    GET /api/v1/layout/home JSON                        │
 │  [{ id: "hero", type: "BANNER_CAROUSEL" }, { id: "camp", ... }]       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     <DynamicLayout widgets={...} />                    │
 │               (Zero switch cases, zero screen coupling)                │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ Look up in WIDGET_REGISTRY[type]
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        Decoupled Widget Registry                       │
 │  • BANNER_CAROUSEL      -> <BannerCarousel />                          │
 │  • CAMPAIGN_COUNTDOWN   -> <CampaignCountdownBanner />                 │
 │  • COMBO_SHOWCASE       -> <ComboBundleShowcase />                     │
 │  • CATEGORY_GRID        -> <CategoryGrid />                            │
 │  • PRODUCT_GRID         -> <ProductGrid />                             │
 └────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Universal Widget Contract (`@celebs/shared-types`)

```typescript
// packages/shared-types/src/types/layout.ts
export interface DynamicWidget<TData = Record<string, unknown>> {
  id: string;
  type: string;
  order: number;
  data: TData;
  styling?: {
    paddingVertical?: number;
    backgroundColor?: string;
    marginBottom?: number;
  };
  analytics?: {
    trackingId: string;
    campaignTag?: string;
  };
}

export interface WidgetProps<TData = Record<string, unknown>> {
  widget: DynamicWidget<TData>;
  onAction?: (actionType: string, payload: unknown) => void;
}
```

---

### 4.3 Mobile Dynamic Layout (`apps/mobile`)

```tsx
// apps/mobile/src/features/layout/components/dynamic-layout.tsx
import React, { memo } from 'react';
import { View } from 'react-native';
import type { DynamicWidget } from '@celebs/shared-types';
import { WIDGET_REGISTRY } from '../widget-registry';

interface DynamicLayoutProps {
  widgets: DynamicWidget[];
  onWidgetAction?: (actionType: string, payload: unknown) => void;
}

export const DynamicLayout = memo(function DynamicLayout({
  widgets,
  onWidgetAction,
}: DynamicLayoutProps) {
  return (
    <>
      {widgets.map((widget) => {
        const WidgetComponent = WIDGET_REGISTRY[widget.type];
        if (!WidgetComponent) {
          return null; // Gracefully skip unrecognized widgets on older app builds
        }

        return (
          <View
            key={widget.id}
            style={{
              paddingVertical: widget.styling?.paddingVertical ?? 0,
              backgroundColor: widget.styling?.backgroundColor ?? 'transparent',
              marginBottom: widget.styling?.marginBottom ?? 0,
            }}
          >
            <WidgetComponent widget={widget as never} onAction={onWidgetAction} />
          </View>
        );
      })}
    </>
  );
});
```

---

### 4.4 Web-Admin SDUI Builder & Live Preview Engine

In Web-Admin, marketing managers configure and preview widgets in a simulated mobile device viewport.

1. **Per-Widget Error Boundaries**: A corrupted widget schema must not crash the admin page.
2. **Fallback for Unknown Widgets**: Unregistered or future widget types render a safe placeholder box.

```tsx
// apps/web-admin/src/features/marketing/components/widget-preview-boundary.tsx
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  widgetType: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetPreviewBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 my-2 border border-destructive/40 bg-destructive/10 rounded-md text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Error previewing widget <strong>{this.props.widgetType}</strong>: {this.state.error?.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 5. Dynamic Platform Configuration Engine

To prevent `.env` configuration rot, runtime toggles and operational thresholds are stored in PostgreSQL and cached in Redis.

### 5.1 Database Schema (Prisma)

```prisma
enum SettingType {
  BOOLEAN
  NUMBER
  STRING
  JSON
}

model PlatformSetting {
  key          String      @id // e.g. "brand_gating_enabled", "festival_campaign_config"
  value        String      // e.g. "false", "{"banner": "...", "active": true}"
  type         SettingType @default(BOOLEAN)
  group        String      @default("GENERAL") // "CATALOG", "CAMPAIGN", "FINANCE", "VENDOR"
  label        String      // "Enable Brand LOA Gating"
  description  String?     // Human-readable explanation for Superadmins
  isPublic     Boolean     @default(false) @map("is_public") // If true, accessible by Mobile App & Web Storefront
  
  updatedBy    String?     @map("updated_by") // Admin user ID for audit logging
  updatedAt    DateTime    @updatedAt
  createdAt    DateTime    @default(now())

  auditLogs    PlatformSettingAudit[]

  @@index([group])
  @@index([isPublic])
}

model PlatformSettingAudit {
  id           String          @id @default(uuid())
  settingKey   String          @map("setting_key")
  setting      PlatformSetting @relation(fields: [settingKey], references: [key], onDelete: Cascade)
  
  oldValue     String?         @map("old_value")
  newValue     String          @map("new_value")
  changedBy    String          @map("changed_by")
  reason       String?

  createdAt    DateTime        @default(now())

  @@index([settingKey, createdAt])
}
```

### 5.2 High-Performance 3-Level Cache Strategy

1. **L1 (In-Memory Process Cache)**: ~0.001ms lookup via Node.js `Map` (TTL: 60s).
2. **L2 (Upstash Redis Singleton)**: ~1–2ms lookup (TTL: 300s).
3. **L3 (PostgreSQL Primary)**: Fallback on cache miss.

---

## 6. Comprehensive 5-Layer Test Matrix

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Layer 5: Concurrency, Revocation & Network Failure Tests (403, Abort)  │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Layer 4: RBAC Cross-Role & Permission Permutation Matrix Tests         │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Layer 3: Dynamic Form & SDUI Widget Schema Contract Tests              │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Layer 2: Web-Admin Integration & Component Tests (RTL + MSW)           │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Layer 1: Unit Tests (@celebs/rbac, usePermission, Can, RoleGuard)      │
 └────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Layer 1: Unit Tests (`@celebs/rbac` & Core Primitives)

| Test ID | Unit Under Test | Scenario | Expected Behavior |
| :--- | :--- | :--- | :--- |
| `UT-RBAC-001` | `can()` | `role = SUPERADMIN`, arbitrary permission | Always returns `true`. |
| `UT-RBAC-002` | `can()` | `role = VENDOR`, `Permission.PRODUCT_CREATE` | Returns `true` (default role capability). |
| `UT-RBAC-003` | `can()` | `role = VENDOR`, `Permission.PLATFORM_MANAGE` | Returns `false` (1P restricted). |
| `UT-RBAC-004` | `hasPermissionAccess()` | `role = STAFF`, `permissions = [PRODUCT_VIEW, ORDER_VIEW]`, `mode = 'ANY'` | Returns `true` if staff has either permission. |
| `UT-RBAC-005` | `hasPermissionAccess()` | `role = STAFF`, `permissions = [PRODUCT_VIEW, PRODUCT_PUBLISH]`, `mode = 'ALL'` | Returns `false` if staff only has `PRODUCT_VIEW`. |
| `UT-HOOK-001` | `usePermission` | Unauthenticated user (`user = null`) | Returns `false` gracefully without exceptions. |
| `UT-COMP-001` | `<Can />` | Unauthorized user with `mode = "disable"` | Clones children with `disabled`, `aria-disabled="true"`, and tooltip wrapper. |
| `UT-GUARD-001` | `<RoleGuard />` | User lacks permission | Redirects to `fallbackPath` (`/403`) with `location.state` preserving `from`, `requiredPermissions`, and `userRole`. |
| `UT-ERR-001` | `<ForbiddenError />` | Rendered with navigation `state` | Displays attempted path, required permission code, "Go Back", and "Back to Dashboard" recovery routes. |

---

### 6.2 Layer 2: Integration & Component Tests (RTL + MSW)

```tsx
// apps/web-admin/src/routes/__tests__/role-guard.spec.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { RoleGuard } from '../role-guard';
import { Permission } from '@celebs/rbac';
import { AuthContext, defaultAuthContext } from '@/context/auth-provider';

const ForbiddenInspector = () => {
  const location = useLocation();
  return (
    <div data-testid="forbidden-page">
      <span data-testid="state-from">{location.state?.from}</span>
      <span data-testid="state-perm">{location.state?.requiredPermissions}</span>
    </div>
  );
};

describe('RoleGuard Integration Tests', () => {
  const renderWithAuth = (user: any, permissions?: Permission | Permission[]) => {
    return render(
      <AuthContext.Provider
        value={{
          ...defaultAuthContext,
          user,
          isLoading: false,
          isAuthenticated: Boolean(user),
          role: user?.role,
        }}
      >
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RoleGuard permissions={permissions}>
                  <div data-testid="protected-content">Access Granted</div>
                </RoleGuard>
              }
            />
            <Route path="/403" element={<ForbiddenInspector />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders protected content when Staff has the required permission', () => {
    renderWithAuth(
      { id: 'staff-1', role: 'STAFF', permissions: [Permission.PRODUCT_VIEW] },
      Permission.PRODUCT_VIEW
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects Staff to /403 with context state when lacking required permission', () => {
    renderWithAuth(
      { id: 'staff-1', role: 'STAFF', permissions: [Permission.ORDER_VIEW] },
      Permission.PRODUCT_VIEW
    );
    expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
    expect(screen.getByTestId('state-from')).toHaveTextContent('/protected');
    expect(screen.getByTestId('state-perm')).toHaveTextContent(Permission.PRODUCT_VIEW);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
```

---

### 6.3 Layer 3: Dynamic Form & SDUI Widget Schema Contract Tests

| Test ID | Component / Feature | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `SDUI-VAL-001` | Widget Schema | `BANNER_CAROUSEL` with valid images and links | Zod validation passes; preview renders successfully. |
| `SDUI-VAL-002` | Widget Schema | `CAMPAIGN_COUNTDOWN` with invalid ISO date | Zod validation fails; form shows field error; preview does not crash. |
| `SDUI-ERR-001` | Widget Error Boundary | Preview component throws runtime exception | Error boundary catches error; renders fallback card with error details. |
| `FORM-1P-001` | Superadmin Product Form | Superadmin opens `AddProductPage` | Vendor Selector is displayed and required before submission. |

---

### 6.4 Layer 4: RBAC Cross-Role Permutation Matrix

| Capability / Permission | SUPERADMIN | ADMIN | VENDOR (Owner) | STAFF (Catalog Mgr) | STAFF (Order Ops) | STAFF (Finance) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `product:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `product:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `product:edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `product:delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `product:publish` | ✅ | ✅ | ✅ | ❌ (Review only)| ❌ | ❌ |
| `order:view` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `order:manage` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `finance:view` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `finance:manage` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `staff:manage` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `platform:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### 6.5 Layer 5: Concurrency, Revocation & Failure Edge Cases

```typescript
// apps/web-admin/src/features/product/__tests__/rbac-concurrency.spec.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useDeleteProduct } from '../hooks/use-delete-product';
import { PRODUCT_QUERY_KEYS } from '../api';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RBAC Concurrency & Revocation Rollback', () => {
  it('rolls back optimistic delete and notifies user when API returns 403', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const initialData = {
      products: [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ],
    };

    queryClient.setQueryData(PRODUCT_QUERY_KEYS.lists(), initialData);

    server.use(
      http.delete('/api/v1/products/prod-1', () => {
        return HttpResponse.json(
          { code: 'PERMISSION_DENIED', message: 'Staff does not have product:delete' },
          { status: 403 }
        );
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteProduct(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('prod-1');
      } catch {
        // Expected mutation rejection
      }
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<any>(PRODUCT_QUERY_KEYS.lists());
      expect(cached.products).toHaveLength(2);
      expect(cached.products.map((p: any) => p.id)).toContain('prod-1');
    });
  });
});
```

---

## 7. Summary of Architectural Benefits

| Dimension | Before (Hardcoded / Static) | After (Dynamic RBAC + SDUI + Manifest Routing) |
| :--- | :--- | :--- |
| **Festival Campaign Toggles** | Requires App Store binary build (2–4 days delay) | **Instant Real-Time Toggle** in Superadmin UI (0s delay) |
| **Adding New Feature Routes** | Manually edit 4+ files (`menu-data.ts`, `routes.tsx`, `resolvers`) | **Declare once in feature `routes.tsx`** via typed `handle` metadata |
| **Sub-Account Staff UX** | 403 deadlocks on login; buttons vanish mysteriously | **Dynamic Landing Resolver + Accessible `<Can mode="disable">` tooltips** |
| **Table Layout Stability** | Empty table columns or layout thrashing | **Pruned column definitions inside `useMemo` before table instantiation** |
| **Mid-Session Revocation** | Broken optimistic UI state and unhandled exceptions | **Deterministic TanStack Query rollbacks and automated 403 session sync** |
| **SDUI Reliability** | Corrupted widget JSON crashes admin interface | **Widget-level Error Boundaries & Zod schema validation** |
