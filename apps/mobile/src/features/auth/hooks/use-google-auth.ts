import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/auth-context';

import { GOOGLE_CLIENT_ID } from '@/constants/config';

WebBrowser.maybeCompleteAuthSession();

type NativeGoogleSignin = {
  configure: (options: { webClientId: string; offlineAccess: boolean }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<void>;
  signIn: () => Promise<unknown>;
  getTokens: () => Promise<{ idToken?: string }>;
};

let nativeGoogleConfigured = false;

/** Lazily resolves the native module and guarantees configure() has run
 *  before first use — the previous useEffect-only setup raced fast taps
 *  and crashed with "apiClient is null". */
const getNativeGoogleSignin = (): NativeGoogleSignin => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  if (!nativeGoogleConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID,
      offlineAccess: true,
    });
    nativeGoogleConfigured = true;
  }
  return GoogleSignin as NativeGoogleSignin;
};

/** Detects when the user intentionally backed out of the flow so we can
 *  reset silently instead of showing a scary error. */
const isCancelledError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === '-5' ||
    err?.code === '12501' ||
    /cancel|dismiss/i.test(err?.message ?? '')
  );
};

export function useGoogleAuth() {
  const { loginWithGoogle } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isNativeFlow = Constants.appOwnership !== 'expo';

  // Expo Auth Session hook for Expo Go
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    clientId: GOOGLE_CLIENT_ID,
  });

  // Warm up native configuration early (idempotent — guarded above)
  useEffect(() => {
    if (!isNativeFlow) return;
    try {
      getNativeGoogleSignin();
    } catch (e) {
      console.warn('[GoogleSignin] Native configure warning:', e);
    }
  }, [isNativeFlow]);

  useEffect(() => {
    async function handleResponse() {
      // User closed the browser sheet — reset quietly
      if (response?.type === 'dismiss' || response?.type === 'cancel') {
        setAuthError(null);
        return;
      }

      if (response?.type === 'success') {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
          const idToken =
            response.params?.id_token ||
            response.authentication?.idToken;

          if (!idToken) {
            throw new Error('Could not retrieve Google ID token');
          }

          await loginWithGoogle({ idToken });
        } catch (err: unknown) {
          const errObj = err as { message?: string };
          console.error('[useGoogleAuth] Authentication failed:', err);
          setAuthError(errObj?.message || 'Google Sign-In failed');
        } finally {
          setIsAuthenticating(false);
        }
      } else if (response?.type === 'error') {
        setAuthError('Google Sign-In was cancelled or encountered an error.');
      }
    }

    if (response) {
      handleResponse();
    }
  }, [response, loginWithGoogle]);

  const signInWithGoogle = async () => {
    setAuthError(null);

    // If running in Standalone APK / Dev Client, use native GoogleSignin
    if (isNativeFlow) {
      setIsAuthenticating(true);
      try {
        const GoogleSignin = getNativeGoogleSignin();

        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();

        const idToken =
          tokens?.idToken ||
          (userInfo as { data?: { idToken?: string } })?.data?.idToken ||
          (userInfo as { idToken?: string })?.idToken;
        if (!idToken) {
          throw new Error('Could not retrieve Google ID token from native sign-in');
        }

        await loginWithGoogle({ idToken });
      } catch (error: unknown) {
        if (isCancelledError(error)) {
          // User backed out — no error, just reset
          setAuthError(null);
          return;
        }
        const errObj = error as { message?: string };
        console.error('[GoogleSignin] Native Error:', error);
        setAuthError(errObj?.message || 'Google Sign-In failed');
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    // Fallback for Expo Go
    if (!request) {
      setAuthError('Google authentication is initializing...');
      return;
    }
    await promptAsync();
  };

  return {
    signInWithGoogle,
    isAuthenticating,
    authError,
    isReady: isNativeFlow ? true : Boolean(request),
  };
}
