import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

import { toastStyles } from './toast.styles';

export type ToastType = 'error' | 'success' | 'info';

interface ToastPayload {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

type Listener = (payload: ToastPayload) => void;

/**
 * Module-level emitter so ANY code — screens, zustand stores, api helpers —
 * can raise a toast without context plumbing or hooks.
 *
 *   showToast('Out of stock');                       // error (default)
 *   showToast('Added to cart', { type: 'success' }); // success
 */
const listeners = new Set<Listener>();
let nextToastId = 0;

export function showToast(
  message: string,
  opts: { type?: ToastType; duration?: number } = {},
): void {
  if (!message) return;
  const payload: ToastPayload = {
    id: nextToastId++,
    message,
    type: opts.type ?? 'error',
    duration: opts.duration ?? 2400,
  };
  listeners.forEach((fn) => fn(payload));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  // Created once; kept in state so render never touches mutable ref values.
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-12));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (payload) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(payload);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          speed: 30,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, payload.duration);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity, translateY]);

  if (!toast) return null;

  return (
    <View style={toastStyles.container} pointerEvents="none">
      {/* Spacer keeps the pill below status bar / header zone */}
      <View style={toastStyles.hitPadding} />
      <Animated.View
        style={[toastStyles.pill, { opacity, transform: [{ translateY }] }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={toast.message}
      >
        {toast.type === 'error' ? <AlertCircle size={16} color="#FFFFFF" /> : null}
        <Text style={toastStyles.message}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}
