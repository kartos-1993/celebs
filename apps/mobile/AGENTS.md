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
