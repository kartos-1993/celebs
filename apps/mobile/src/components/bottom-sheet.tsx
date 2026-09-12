import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from './bottom-sheet.styles';
import { useBottomSheetAnimation } from './use-bottom-sheet-animation';

import { Spacing } from '@/constants/theme';
import { isKeyboardControllerSupported } from '@/providers/keyboard-provider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_HEIGHT_RATIO = 0.9;

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const sheetHeight = Math.round(SCREEN_HEIGHT * heightRatio);

  const { mounted, slide, overlayOpacity, dragOffset, panResponder } = useBottomSheetAnimation({
    visible,
    sheetHeight,
    onClose,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.avoidingContainer}
            enabled={isKeyboardControllerSupported}
          >
            <View style={styles.body}>{children}</View>
            {footer ? (
              <View
                style={[
                  styles.footer,
                  { paddingBottom: isKeyboardOpen ? Spacing.sm : insets.bottom + Spacing.sm },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
