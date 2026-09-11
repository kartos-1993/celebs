import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { registerPushTokenApi } from '../api';

import { useAuth } from '@/features/auth/context/auth-context';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure foreground notification presentation safely
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Safe fallback if native module isn't available
}

export function usePushNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    async function registerForPush() {
      // Remote push notifications are only supported on physical devices with custom dev-client builds
      if (Platform.OS === 'web' || isExpoGo || !Device.isDevice) {
        return;
      }

      try {
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
        if (token) {
          setExpoPushToken(token);
          await registerPushTokenApi(token);
        }
      } catch {
        // Non-blocking registration
      }
    }

    registerForPush();

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification?.request?.content?.data;
          if (data && typeof data.url === 'string' && data.url.startsWith('/')) {
            router.push(data.url as never);
          }
        },
      );
    } catch {
      // Safe fallback if running in an unsupported environment
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, router]);

  return { expoPushToken };
}
