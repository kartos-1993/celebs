# Mobile Architectural Mandates (`apps/mobile`)

## 1. Cross-Platform & Native Invariants (Expo / React Native)

- Native Synthetic Events: Mobile UI components MUST use native synthetic event signatures (`GestureResponderEvent`, `NativeSyntheticEvent<NativeScrollEvent>`).
- Native Theme Tokens: Use native theme properties (`ColorValue`) rather than web-only DOM properties.
- Guard Dynamic Imports: Platform-specific dynamic module imports or asset requires in Expo MUST be guarded with scoped lint rules (`// eslint-disable-next-line @typescript-eslint/no-require-imports`).

## 2. Gesture & Render Stability

- Hook Stability: Functions passed to gesture handlers or native list components (`FlatList`, `FlashList`) MUST be memoized via `useCallback`.
- Memory Leaks: Event listeners (NetInfo, AppState, keyboard listeners) and timers MUST include explicit teardown routines in `useEffect` return blocks.

## 3. Offline State & Mutation Reliability

- Optimistic Mutations: Use optimistic rollbacks when persisting changes offline.
- Storage Persistence: State persisting offline must use AsyncStorage or SQLite with strongly-typed schemas.

## 4. API Client Layer Isolation (Zero Raw Network Calls in Hooks)

- Dedicated API Clients: All HTTP network requests MUST be defined in `src/features/{domain}/api/{domain}-api.ts` (or `api.ts`).
- Ban Raw `apiClient` in Custom Hooks: Never call `apiClient.get(...)` or `apiClient.post(...)` directly inside custom hooks or UI components (e.g. `use-sdui-layout.ts`). All requests must route through domain-isolated API client methods.

## 5. Canonical Response Envelope & Ban on Fallback Cascades

- Uniform Return Shape: Mobile API clients must return `IApiResponse<T>` (or unwrap `response.data`).
- Strict Typing: Custom hooks and TanStack Query consumers must access typed payload `res.data`.
- Ban Defensive Fallback Cascades (The Ponytail Rule): Multi-tier fallback chaining like `response.data?.data?.data ?? response.data?.data ?? []` (e.g. in `use-products.ts`) is strictly forbidden. If an endpoint returns an unexpected shape, fix the backend controller at the source. Never write defensive client shims to accommodate malformed API envelopes.

## 6. Query Key Factory Pattern for Server State

- Centralized Query Keys: All TanStack Query hooks in `apps/mobile` MUST use centralized Query Key Factories (e.g. `SDUI_QUERY_KEYS`, `PRODUCTS_QUERY_KEYS`, `AUTH_QUERY_KEYS`). Hardcoded string query keys (e.g. `['sdui', 'layout']`) are forbidden.

## 7. Pre-Production YAGNI & Direct Canonical Contracts

- In active development, build directly to the canonical `IApiResponse<T>` contract from scratch.
- Do not create dual-schema parsing, backward-compatibility wrappers, or defensive fallback layers. Fail fast, fix at the root, and keep client models lean.

## 8. StyleSheet Organization & Readability Mandates

- **Zero Inline Style Objects in Render**: Inline style declarations (`style={{ flex: 1, padding: 12 }}`) allocate new objects on each render pass and clutter JSX. All styles must use `StyleSheet.create` defined outside the component function or in an adjacent `[component].styles.ts` file.
- **Theme Token Discipline**: Never hardcode hex colors (`#1E293B`) or arbitrary spacing units. Always bind styles to central design tokens (`colors`, `spacing`, `typography`, `radii`).
- **Semantic Style Hierarchy**: Order and name style keys according to visual structure: `container`, `contentWrapper`, `header`, `title`, `badgeRow`, `actionButton`, `buttonText`.
- **Dynamic Styling via Clean Style Arrays**: Compose dynamic/conditional styles via array syntax: `style={[styles.base, isActive && styles.active]}`. Avoid complex inline ternary style objects.
- **Isolated List & Gesture Renderers**: `renderItem` callbacks in `FlatList` or `FlashList` must be dedicated, memoized components (`ProductListItem`), not monolithic inline JSX render functions.
