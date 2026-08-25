import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from './bottom-sheet.styles';

import { Spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_HEIGHT_RATIO = 0.9;
const SLIDE_IN_DURATION = 280;
const SLIDE_OUT_DURATION = 220;
const CLOSE_DRAG_DISTANCE = 120;
const CLOSE_DRAG_VELOCITY = 0.9;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  heightRatio?: number;
  accessibilityLabel?: string;
}

export function BottomSheet({
  visible,
  onClose,
  header,
  footer,
  children,
  heightRatio = DEFAULT_HEIGHT_RATIO,
  accessibilityLabel = 'Bottom sheet',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(SCREEN_HEIGHT * heightRatio);
  const [mounted, setMounted] = useState(visible);

  const slide = useRef(new Animated.Value(sheetHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
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
    const timer = setTimeout(() => setMounted(false), SLIDE_OUT_DURATION);
    return () => clearTimeout(timer);
  }, [visible, sheetHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.vx) < 1.5,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) dragOffset.setValue(gesture.dy);
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
        onPanResponderTerminate: () =>
          Animated.spring(dragOffset, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [dragOffset, onClose],
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={onClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY: Animated.add(slide, dragOffset) }],
            },
          ]}
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          {header}
          <View style={styles.body}>{children}</View>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
