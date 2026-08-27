---
name: fsd-feature-scaffold
description: 'Standard procedure to scaffold a new Feature-Sliced Design (FSD) domain slice in apps/web-admin.'
---

# Feature-Sliced Design Scaffold Runbook

Every new feature in `apps/web-admin/src/features/{domain}/` must follow this exact 5-file architecture:

```
src/features/{domain}/
├── api.ts              # Axios endpoints + QUERY_KEYS factory
├── types.ts            # UI state types (never duplicate @celebs/shared-types)
├── hooks/
│   ├── use-{domain}-queries.ts
│   └── use-{domain}-mutations.ts
├── components/         # Domain-specific UI (max 150 lines/file)
├── pages/              # Lazy-loaded page orchestrators (<60 lines)
└── routes.tsx          # RouteObject with RoleGuard and crumb metadata
```

## Mandatory Rules

1. **Query Key Factory**: Every query and mutation key must come from `api.ts`.
2. **Component Purity**: No non-component exports in `.tsx` files.
3. **No Barrel Files**: Never create `index.ts` in feature root or subdirectories.
4. **Context Isolation**: Pass `control` explicitly to deeply nested RHF fields.
