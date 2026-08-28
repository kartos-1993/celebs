import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { User } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { LoginForm } from '@/features/auth/components/login-form';
import { ProfileScreenView } from '@/features/auth/components/profile-screen-view';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { styles } from '@/features/auth/styles/profile.styles';

export default function MeScreen() {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleRealGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      showToast((err as { message?: string })?.message || 'Failed to initialize Google Sign-In', {
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.black} />
      </ThemedView>
    );
  }

  if (isLoggedIn && user) {
    return (
      <ThemedView style={styles.container}>
        <ProfileScreenView user={user} onLogout={logout} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authBanner}>
          <User size={40} color={Palette.gray900} strokeWidth={1.7} />
          <ThemedText style={styles.authTitle}>Welcome to Celebs</ThemedText>
          <ThemedText style={styles.authSub}>
            Sign in to track orders live, save shipping addresses, and sync your cart.
          </ThemedText>
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleRealGoogleSignIn}
          disabled={isAuthenticating}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {isAuthenticating ? (
            <ActivityIndicator color={Palette.black} />
          ) : (
            <>
              <View style={styles.googleGLogo}>
                <ThemedText style={styles.googleGText}>G</ThemedText>
              </View>
              <ThemedText style={styles.googleBtnText}>Continue with Google</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or sign in with email</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.tabToggleBtn, authMode === 'login' && styles.tabToggleActive]}
            onPress={() => setAuthMode('login')}
            accessibilityRole="button"
            accessibilityState={{ selected: authMode === 'login' }}
          >
            <ThemedText
              style={[styles.tabToggleText, authMode === 'login' && styles.tabToggleTextActive]}
            >
              Log In
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, authMode === 'register' && styles.tabToggleActive]}
            onPress={() => setAuthMode('register')}
            accessibilityRole="button"
            accessibilityState={{ selected: authMode === 'register' }}
          >
            <ThemedText
              style={[styles.tabToggleText, authMode === 'register' && styles.tabToggleTextActive]}
            >
              Register
            </ThemedText>
          </TouchableOpacity>
        </View>

        {authMode === 'login' ? <LoginForm /> : <RegisterForm />}
      </ScrollView>
    </ThemedView>
  );
}
