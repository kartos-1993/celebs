# web-admin Agent Guide

Vite + React 19 + TS + Tailwind v4 + react-router. UI primitives live in `packages/shared-ui` (`@celebs/shared-ui/components/*`). **Never hand-roll UI that a shared primitive already covers.** Read this before writing or reviewing any page.

## The one rule

If you are about to write raw HTML for a control (`<select>`, `<input type="checkbox">`, `fixed inset-0` overlays, custom tab bars), STOP — there is a shared component. Grep `packages/shared-ui/src/components/` first.

## Shared component map

| Need | Use | NEVER |
|---|---|---|
| Dropdown | `Select / SelectContent / SelectItem / SelectTrigger / SelectValue` | native `<select>` |
| Checkbox | `Checkbox` (`checked` + `onCheckedChange`) | `<input type="checkbox">` |
| Modal | `Dialog / DialogContent / DialogHeader / DialogTitle / DialogDescription / DialogFooter` | `fixed inset-0 bg-black/60` overlay divs, text `✕` close buttons |
| Confirm dialog | `ConfirmDialog` (has `destructive`, `confirmLabel`, async `onConfirm`) | ad-hoc confirm modals |
| Tabs | `Tabs / TabsList / TabsTrigger` | hand-rolled underline/pill button bars with manual active classes |
| Tooltip on icon buttons | `Tooltip > TooltipTrigger asChild > … <TooltipContent>` | bare `title` attributes as the only label |
| Empty table/list state | `EmptyState` (`icon`, `title`, `description`, `action`) | plain centered text lines |
| Page loading | `PageLoader`; in-table: `h-32` centered muted text or `Spinner` | nothing / layout shift |
| Toasts | `useToast()` from `@/hooks/use-toast` | `alert()`, silent failures |
| Text field | `Input`, `Textarea`, `PasswordInput`, `NumberInput` | unstyled inputs |
| Labels | `Label` | bare `<label>` without styling parity |

Radix gotcha: `SelectItem` values cannot be empty strings — use a sentinel (e.g. `'ALL'`) and map it back.

## List page recipe (the house pattern)

Reference implementations: `features/vendors/pages/vendor-list-page.tsx`, `features/product/components/manage-product.tsx`.

```
<PageHeader title description actions={primary button} />
<FilterBar>                        ← from @/components/filter-bar — THE toolbar
  <FilterSearch value onChange placeholder />   ← debounced at page level (~350ms)
  <SegmentedTabs options value onChange />      ← black-pill status switcher, right side
</FilterBar>
<Card>
  <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">  ← every table
    <Table>…
  </div>
  [pagination]
</Card>
```

- `Tabs/TabsList` are for **content panes** (e.g. modal tab navigation). List-page **status filtering always uses `SegmentedTabs`** inside `FilterBar`.
- Contextual batch-action bars render as their own row between `FilterBar` and the table.
- Loading: `flex h-32 items-center justify-center text-sm text-muted-foreground`
- Empty: `<EmptyState icon={<Thing className="h-8 w-8" />}`
- Fetching refetches: dim wrapper `opacity-60 transition-opacity`

## Table conventions

- Money columns: header + cells `text-right`.
- Actions column: header `text-right`; cell `text-right` + `flex items-center justify-end gap-0.5 whitespace-nowrap`.
- **Row actions are compact icon buttons** (`size="sm" variant="ghost" className="h-8 w-8 p-0"`), color-coded by semantics, each wrapped in a Tooltip + `sr-only` span:

| Action | Icon | Tint class on ghost button |
|---|---|---|
| View / inspect / preview | `Eye` | `text-muted-foreground hover:text-foreground` |
| Approve / activate | `Check` | `text-success hover:bg-success/10 hover:text-success` |
| Reject / deactivate | `X` | `text-destructive hover:bg-destructive/10` |
| Edit | `Pencil` | default foreground |
| Delete / archive | `Trash2` | destructive tint, must open a confirm dialog |
| Overflow menu | `MoreHorizontal` | dropdown trigger, never literal `▼` text |

Full-text labeled buttons belong inside modals/detail views, not table rows.
- Status badges: human-readable labels only — never raw snake_case enum values (`pending_review` → "Pending Review"). Keep a `statusLabels` map next to the page.
- Row hover is built into `TableRow`; don't re-add it per row.

## Dialog conventions

- Footer = `DialogFooter`: Cancel (`variant="outline"`) left of the primary action.
- Primary destructive actions use `variant="destructive"`; approve-style success uses `variant="default" className="bg-success hover:bg-success/90 text-success-foreground"`.
- While submitting: disable the button AND swap its icon for `<Spinner size="sm" />`.
- Controlled modals render conditionally (`{open && <Dialog open …>}`) when they hold per-entity form state.

## Money & data display

- Prices: `Rs. {value.toLocaleString()}`. Discounted PDP order: discounted price prominent → original struck through (`line-through`) → `% OFF` badge.
- Never render unknown objects directly (`String(value)` on objects gives `[object Object]`). Format values through a helper that handles primitives, arrays (join), `{label|name}`, `{value, unit}`, JSON fallback.
- Images always get `/placeholder.svg` fallback via `onError`.

## Uploads

Only via `directUploadFile(file, folder, scope)` / `directUploadBatch` from `@/lib/media-upload`. Folders must satisfy the API allowlist (`celebs/products`, `celebs/kyc`, `vendors`, `platform`); pass the semantically correct `scope` (`PRODUCT`, `KYC`, `MARKETING`). Current mapping: products→`celebs/products`, KYC/vendor docs→`celebs/kyc`+KYC, marketing/banners→`platform`+MARKETING.

## RBAC

Gate pages with `RoleGuard requiredPermission={…}` in the feature's `routes.tsx`. Gate in-page controls with `can(role, Permission.X, userPermissions)`. Do not add hardcoded role-string checks — permissions are the source of truth.

## Known debt (don't copy these patterns; fix when touched)

- `features/category/components/category-tree.tsx` — legacy tree UI.
- Marketing list pages lack `EmptyState` (plain text empty rows).
- `staff-list-page.tsx` table actions still full-text (Edit/Delete); convert to icon+tooltip when editing that file.

## Before committing UI changes

1. `npm run lint && npm run typecheck` in `apps/web-admin` — both must pass.
2. No new native `<select>` / checkbox / overlay div / `▼` / `[object Object]` introduced.
3. New list pages follow the recipe above (wrapper div, EmptyState, right-aligned compact actions).
4. Every destructive action has a confirm dialog; every async button shows pending feedback (Spinner/disabled).
