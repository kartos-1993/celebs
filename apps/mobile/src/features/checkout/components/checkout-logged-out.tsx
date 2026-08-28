import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, Lock } from 'lucide-react-native';

import { styles } from '../styles/checkout.styles';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';

interface CheckoutLoggedOutProps {
  insetsTop: number;
  isAuthenticating: boolean;
  onBack: () => void;
  onSignInWithGoogle: () => void;
  onSignInWithEmail: () => void;
}

export function CheckoutLoggedOut({
  insetsTop,
  isAuthenticating,
  onBack,
  onSignInWithGoogle,
  onSignInWithEmail,
}: CheckoutLoggedOutProps) {
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insetsTop }]}>
        <TouchableOpacity
          style={styles.headerIconSlot}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={Palette.gray900} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerIconSlot} />
      </View>

      <View style={styles.authNoticeContainer}>
        <Lock size={48} color={Palette.gray900} strokeWidth={1.6} />
        <ThemedText style={styles.authNoticeTitle}>Sign In to Proceed to Checkout</ThemedText>
        <ThemedText style={styles.authNoticeDesc}>
          Your items are saved safely in your cart. Sign in with Google to pick your delivery
          address and complete your order.
        </ThemedText>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={onSignInWithGoogle}
          disabled={isAuthenticating}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          {isAuthenticating ? (
            <ActivityIndicator color={Palette.black} />
          ) : (
            <>
              <View style={styles.googleGLogo}>
                <ThemedText style={styles.googleGText}>G</ThemedText>
              </View>
              <ThemedText style={styles.googleBtnText}>Sign In with Google</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onSignInWithEmail}>
          <ThemedText style={styles.secondaryBtnText}>Sign In with Email / Password</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
