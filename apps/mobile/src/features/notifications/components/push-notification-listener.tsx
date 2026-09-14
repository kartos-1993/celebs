import React from 'react';

import { usePushNotifications } from '../hooks/use-push-notifications';

export const PushNotificationListener = React.memo(function PushNotificationListener() {
  usePushNotifications();
  return null;
});
