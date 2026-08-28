---
name: rest-crud-query-factory
description: 'Canonical runbook for RESTful HTTP method mapping, client function naming, Query Key Factories, and mutation hooks across apps/api, apps/web-admin, and apps/mobile.'
---

# Canonical REST CRUD & Query Key Runbook

Use this skill whenever adding or refactoring endpoints, API clients, or query hooks across `apps/api`, `apps/web-admin`, and `apps/mobile`.

## 1. The 6-Method REST Mapping Standard

Every domain resource `<Resource>` (singular PascalCase) / `<resources>` (plural lowercase) maps database operations to HTTP verbs:

| HTTP Verb  | REST Path          | Controller Method   | Client Function Name            | Query Key Factory Invalidation                            | Hook Name                  |
| :--------- | :----------------- | :------------------ | :------------------------------ | :-------------------------------------------------------- | :------------------------- |
| **GET**    | `/<resources>`     | `get<Resources>`    | `get<Resources>(filters?)`      | Read collection                                           | `use<Resources>(filters?)` |
| **GET**    | `/<resources>/:id` | `get<Resource>ById` | `get<Resource>ById(id)`         | Read single                                               | `use<Resource>(id)`        |
| **POST**   | `/<resources>`     | `create<Resource>`  | `create<Resource>(payload)`     | Invalidate `<RESOURCE>_QUERY_KEYS.lists()`                | `useCreate<Resource>()`    |
| **PUT**    | `/<resources>/:id` | `update<Resource>`  | `update<Resource>(id, payload)` | Invalidate `<RESOURCE>_QUERY_KEYS.detail(id)` & `lists()` | `useUpdate<Resource>()`    |
| **PATCH**  | `/<resources>/:id` | `patch<Resource>`   | `patch<Resource>(id, delta)`    | Invalidate `<RESOURCE>_QUERY_KEYS.detail(id)` & `lists()` | `usePatch<Resource>()`     |
| **DELETE** | `/<resources>/:id` | `delete<Resource>`  | `delete<Resource>(id)`          | Invalidate `<RESOURCE>_QUERY_KEYS.all`                    | `useDelete<Resource>()`    |

## 2. Universal Query Key Factory Pattern (Feature Co-located)

Query keys MUST NOT be dumped into a single global file. In both `apps/web-admin` and `apps/mobile`, query keys MUST be co-located inside each domain's feature folder (e.g., `src/features/{domain}/api.ts` or `src/features/{domain}/query-keys.ts`), following this schema:

```ts
export const <RESOURCE>_QUERY_KEYS = {
  all: ['<resources>'] as const,
  lists: () => [...<RESOURCE>_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: <Resource>FilterType) =>
    [...<RESOURCE>_QUERY_KEYS.lists(), filters ?? {}] as const,
  details: () => [...<RESOURCE>_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) =>
    [...<RESOURCE>_QUERY_KEYS.details(), id] as const,
};
```

## 3. Mandatory Rules

1. **Domain Co-location**: Query keys and API clients MUST live inside their respective feature slice (`src/features/{domain}/`). Global monolithic files (e.g. `src/constants/query-keys.ts`) are strictly prohibited.
2. **Plural Nouns**: URL prefixes must use plural nouns (`/products`, `/categories`, `/orders`, `/brands`).
3. **No Action Verbs in Path**: Never use `POST /:id/archive` (use `DELETE /:id`), `POST /:id/toggle-activation` (use `PATCH /:id`), or `GET /my-orders` (use `GET /orders?scope=mine`).
4. **No Raw API Calls in UI**: Never call `apiClient.get/post` inside `.tsx` components. All server data must flow through TanStack Query hooks.
5. **Precise Cache Invalidation**: Mutations must invalidate targeted query keys using the factory, never broad global resets.
