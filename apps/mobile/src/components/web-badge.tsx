import { useColorScheme } from 'react-native';
import { version } from 'expo/package.json';
import { Image } from 'expo-image';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { styles } from './web-badge.styles';

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="code" themeColor="textSecondary" style={styles.versionText}>
        v{version}
      </ThemedText>
      <Image
        source={
          scheme === 'dark'
            ? // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('@/assets/images/expo-badge-white.png')
            : // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('@/assets/images/expo-badge.png')
        }
        style={styles.badgeImage}
      />
    </ThemedView>
  );
}

