import React from 'react';
import { NativeModules, Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Constants from 'expo-constants';

const isExpoGo =
  Constants.appOwnership === 'expo' || (Constants.executionEnvironment as string) === 'storeClient';

export const isKeyboardControllerSupported =
  !isExpoGo &&
  Platform.OS !== 'web' &&
  !!(
    NativeModules.KeyboardController ||
    (global as unknown as { __turboModuleProxy?: (name: string) => unknown })?.__turboModuleProxy?.(
      'NativeKeyboardController',
    )
  );

export function AppKeyboardProvider({ children }: { children: React.ReactNode }) {
  if (!isKeyboardControllerSupported) {
    return <>{children}</>;
  }

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      {children}
    </KeyboardProvider>
  );
}
