import { useCallback, useEffect, useRef } from 'react';
import type { WebViewNavigation } from 'react-native-webview';

export const parseStatus = (url: string): string => {
  const match = url.match(/[?&]status=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : 'COMPLETED';
};

export function usePaymentInterceptor(visible: boolean, onSuccess: (status: string) => void) {
  const hasHandledResult = useRef(false);

  useEffect(() => {
    if (visible) {
      hasHandledResult.current = false;
    }
  }, [visible]);

  const interceptPaymentResult = useCallback(
    (url: string): boolean => {
      if (url.startsWith('celebs://') || url.includes('payment-result')) {
        if (!hasHandledResult.current) {
          hasHandledResult.current = true;
          onSuccess(parseStatus(url));
        }
        return true;
      }
      return false;
    },
    [onSuccess],
  );

  const handleNavChange = useCallback(
    (navState: WebViewNavigation) => {
      interceptPaymentResult(navState.url);
    },
    [interceptPaymentResult],
  );

  const handleShouldStartLoad = useCallback(
    (request: WebViewNavigation) => !interceptPaymentResult(request.url),
    [interceptPaymentResult],
  );

  return {
    handleNavChange,
    handleShouldStartLoad,
  };
}
