import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';

import { registerPushTokenApi } from '../api';

import { useAuth } from '@/features/auth/context/auth-context';

interface NotificationResponseData {
  notification?: {
    request?: {
      content?: {
        data?: Record<string, unknown>;
      };
    };
  };
}

/**
 * Remote push notifications are only supported on physical devices with custom
 * development builds (expo-dev-client / standalone APK).
 * Expo Go SDK 53+ throws a fatal error if expo-notifications is evaluated
 * on Android, so we lazy-load the module strictly outside of Expo Go.
 */
const isPushSupported =
  Constants.appOwnership !== 'expo' && Platform.OS !== 'web' && Device.isDevice;

const getNotifications = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
};

export function usePushNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPushSupported) return;

    let isMounted = true;
    let notificationListener: { remove: () => void } | null = null;
    let responseListener: { remove: () => void } | null = null;

    async function registerForPush() {
      try {
        const Notifications = getNotifications();

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId ??
          '3a54d402-6501-43f8-b834-c690e2e49a71';

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData?.data;
        if (token && isMounted) {
          setExpoPushToken(token);
          await registerPushTokenApi(token);
        }

        notificationListener = Notifications.addNotificationReceivedListener(() => {});

        responseListener = Notifications.addNotificationResponseReceivedListener(
          (response: NotificationResponseData) => {
            const data = response.notification?.request?.content?.data;
            if (data && typeof data.url === 'string' && data.url.startsWith('/')) {
              router.push(data.url as never);
            }
          },
        );
      } catch (err) {
        console.warn('[PushNotification] Native setup skipped:', err);
      }
    }

    registerForPush();

    return () => {
      isMounted = false;
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, [user, router]);

  return { expoPushToken };
}
