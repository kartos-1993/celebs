import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Heart, LogOut, MapPin, ShieldCheck, ShoppingBag } from 'lucide-react-native';

import { styles } from '../styles/profile.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import type { UserProfile } from '@/features/auth/context/auth-context';

const TAB_BAR_CONTENT_HEIGHT = 56;

interface ProfileScreenViewProps {
  user: UserProfile;
  onLogout: () => void;
}

export function ProfileScreenView({ user, onLogout }: ProfileScreenViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogoutConfirm = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + TAB_BAR_CONTENT_HEIGHT + Spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatarBadge}>
          <ThemedText style={styles.avatarText}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </ThemedText>
        </View>

        <View style={styles.profileInfo}>
          <ThemedText style={styles.userName}>{user.name}</ThemedText>
          <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={13} color={Palette.success} />
            <ThemedText style={styles.verifiedText}>Verified Customer</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.sectionBand} />

      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemDivided]}
          onPress={() => router.push('/orders')}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="My orders"
        >
          <View style={styles.menuItemLeft}>
            <ShoppingBag size={19} color={Palette.gray900} strokeWidth={1.8} />
            <ThemedText style={styles.menuItemTitle}>My Orders</ThemedText>
          </View>
          <ChevronRight size={17} color={Palette.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemDivided]}
          onPress={() => router.push('/wishlist')}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Saved wishlist"
        >
          <View style={styles.menuItemLeft}>
            <Heart size={19} color={Palette.gray900} strokeWidth={1.8} />
            <ThemedText style={styles.menuItemTitle}>Saved Wishlist</ThemedText>
          </View>
          <ChevronRight size={17} color={Palette.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/checkout')}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Shipping addresses"
        >
          <View style={styles.menuItemLeft}>
            <MapPin size={19} color={Palette.gray900} strokeWidth={1.8} />
            <ThemedText style={styles.menuItemTitle}>Shipping Addresses</ThemedText>
          </View>
          <ChevronRight size={17} color={Palette.gray400} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionBand} />

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogoutConfirm}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <LogOut size={17} color={Palette.danger} />
        <ThemedText style={styles.logoutText}>Log Out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}
