import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

interface InAppPaymentSheetProps {
  visible: boolean;
  paymentUrl: string | null;
  title: string;
  onClose: () => void;
  onSuccess: (status: string) => void;
}

const parseStatus = (url: string): string => {
  const match = url.match(/[?&]status=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : 'COMPLETED';
};

export function InAppPaymentSheet({
  visible,
  paymentUrl,
  title,
  onClose,
  onSuccess,
}: InAppPaymentSheetProps) {
  const insets = useSafeAreaInsets();
  const hasHandledResult = useRef(false);

  useEffect(() => {
    if (visible) {
      hasHandledResult.current = false;
    }
  }, [visible]);

  if (!visible || !paymentUrl) return null;

  const interceptPaymentResult = (url: string): boolean => {
    if (url.startsWith('celebs://') || url.includes('payment-result')) {
      if (!hasHandledResult.current) {
        hasHandledResult.current = true;
        onSuccess(parseStatus(url));
      }
      return true;
    }
    return false;
  };

  const handleNavChange = (navState: WebViewNavigation) => {
    interceptPaymentResult(navState.url);
  };

  const handleShouldStartLoad = (request: WebViewNavigation) => {
    if (interceptPaymentResult(request.url)) {
      return false;
    }
    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom || Spacing.md }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close payment sheet"
            >
              <X size={20} color={Palette.gray900} />
            </TouchableOpacity>
          </View>

          <View style={styles.webContainer}>
            <WebView
              source={{ uri: paymentUrl }}
              style={styles.webview}
              originWhitelist={['*']}
              onNavigationStateChange={handleNavChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onError={(e) => console.warn('[InAppPaymentSheet Error]:', e.nativeEvent)}
              onHttpError={(e) =>
                console.warn(
                  '[InAppPaymentSheet HTTP Error]:',
                  e.nativeEvent.statusCode,
                  e.nativeEvent.url,
                )
              }
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              webviewDebuggingEnabled
              userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#f95738" />
                  <ThemedText style={styles.loadingText}>Loading payment gateway...</ThemedText>
                </View>
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    height: '88%',
    backgroundColor: Palette.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.gray200,
    paddingHorizontal: Spacing.md,
  },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.gray900 },
  closeBtn: { position: 'absolute', right: Spacing.md, padding: Spacing.xs },
  webContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: Palette.white },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: { fontSize: FontSize.small, color: Palette.gray600, fontWeight: FontWeight.medium },
});
