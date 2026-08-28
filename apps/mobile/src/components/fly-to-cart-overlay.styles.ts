import { StyleSheet } from 'react-native';

import { Palette } from '@/constants/theme';

export const styles = StyleSheet.create({
  flyingCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.white,
    // Performant shadow: elevation for Android, shadow only for iOS initial frame
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  // Screenshot frame: mimics iOS screenshot with rounded corners and thin border
  screenshotFrame: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: Palette.white,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
