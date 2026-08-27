---
name: expo-offline-mutation
description: 'Runbook for offline mutation queues, native synthetic events, and gesture memory stability in apps/mobile.'
---

# Expo Offline Mutation & Gesture Stability Runbook (`apps/mobile`)

Use this skill whenever working on data-fetching or user interaction screens in `apps/mobile`.

## Mandatory Rules

1. **Native Synthetic Events**:

   - Always type touch handlers with `GestureResponderEvent` or `NativeSyntheticEvent<T>`.
   - Never use web synthetic events or DOM properties.

2. **Optimistic Offline Mutations**:

   - Save mutation payload to local encrypted cache (AsyncStorage or SQLite).
   - Update UI optimistically with rollback on server rejection.

3. **Memory Leak Prevention**:
   - Wrap dynamic event subscriptions (NetInfo, keyboard, hardware back button) in `useEffect`.
   - Always return an explicit unsubscribe callback from `useEffect`.
