import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, PanResponderInstance } from 'react-native';

const SLIDE_IN_DURATION = 280;
const SLIDE_OUT_DURATION = 220;
const CLOSE_DRAG_DISTANCE = 120;
const CLOSE_DRAG_VELOCITY = 0.9;

interface UseBottomSheetAnimationProps {
  visible: boolean;
  sheetHeight: number;
  onClose: () => void;
}

interface UseBottomSheetAnimationReturn {
  mounted: boolean;
  slide: Animated.Value;
  overlayOpacity: Animated.Value;
  dragOffset: Animated.Value;
  panResponder: PanResponderInstance;
}

export function useBottomSheetAnimation({
  visible,
  sheetHeight,
  onClose,
}: UseBottomSheetAnimationProps): UseBottomSheetAnimationReturn {
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) {
    setMounted(true);
  }

  const [slide] = useState(() => new Animated.Value(sheetHeight));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [dragOffset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      dragOffset.setValue(0);
      slide.setValue(sheetHeight);
      overlayOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: SLIDE_IN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: SLIDE_IN_DURATION - 80,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(slide, {
        toValue: sheetHeight,
        duration: SLIDE_OUT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: SLIDE_OUT_DURATION - 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMounted(false);
    }, SLIDE_OUT_DURATION);

    return () => clearTimeout(timer);
  }, [visible, sheetHeight, dragOffset, overlayOpacity, slide]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.vx) < 1.5,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) {
            dragOffset.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose = gesture.dy > CLOSE_DRAG_DISTANCE || gesture.vy > CLOSE_DRAG_VELOCITY;
          if (shouldClose) {
            dragOffset.setValue(0);
            onClose();
            return;
          }
          Animated.spring(dragOffset, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragOffset, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [dragOffset, onClose],
  );

  return {
    mounted,
    slide,
    overlayOpacity,
    dragOffset,
    panResponder,
  };
}
