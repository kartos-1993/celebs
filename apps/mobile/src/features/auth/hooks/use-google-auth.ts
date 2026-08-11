import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/auth-context';

import { GOOGLE_CLIENT_ID } from '@/constants/config';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const { loginWithGoogle } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Expo Auth Session hook for Expo Go
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    clientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (Constants.appOwnership !== 'expo') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: GOOGLE_CLIENT_ID,
          offlineAccess: true,
        });
      } catch (e) {
        console.warn('[GoogleSignin] Native configure warning:', e);
      }
    }
  }, []);

  useEffect(() => {
    async function handleResponse() {
      if (response?.type === 'success') {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
          const { id_token, access_token } = response.params;
          const tokenToUse =
            id_token ||
            response.authentication?.idToken ||
            access_token ||
            response.authentication?.accessToken;

          let googleUser = {
            email: '',
            name: '',
            picture: '',
            googleId: '',
          };

          if (tokenToUse) {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenToUse}` },
            }).catch(() => null);

            if (userinfoRes && userinfoRes.ok) {
              const userInfo = await userinfoRes.json();
              googleUser = {
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
                picture: userInfo.picture,
                googleId: userInfo.sub,
              };
            }
          }

          if (!googleUser.email) {
            throw new Error('Could not retrieve Google profile data');
          }

          await loginWithGoogle(googleUser);
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
    if (Constants.appOwnership !== 'expo') {
      setIsAuthenticating(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();

        const user = userInfo.data?.user || (userInfo as { user?: { email?: string; name?: string; givenName?: string; photo?: string; id?: string } }).user;
        if (!user?.email) {
          throw new Error('Could not retrieve Google profile details');
        }

        await loginWithGoogle({
          email: user.email,
          name: user.name || user.givenName || user.email.split('@')[0],
          picture: user.photo,
          googleId: user.id,
        });
      } catch (error: unknown) {
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
    isReady: true,
  };
}
