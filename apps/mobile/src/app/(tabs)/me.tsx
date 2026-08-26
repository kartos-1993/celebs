import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronRight,
  Heart,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react-native';

import { PasswordInput } from '@/components/password-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { styles } from '@/features/auth/styles/profile.styles';

// Mirrors TAB_BAR_CONTENT_HEIGHT in (tabs)/_layout.tsx
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, isLoading, loginWithEmail, register, logout } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Real Google Sign In
  const handleRealGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      Alert.alert(
        'Google Sign-In Error',
        (err as { message?: string })?.message || 'Failed to initialize Google Sign-In',
      );
    }
  };

  // Handle Email/Password Submission
  const PASSWORD_POLICY =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  const handleSubmitForm = async () => {
    if (!email || !password || (authMode === 'register' && !name)) {
      Alert.alert('Missing Fields', 'Please fill out all required fields');
      return;
    }

    if (authMode === 'register') {
      if (name.trim().length < 3) {
        Alert.alert('Invalid Name', 'Name must be at least 3 characters long.');
        return;
      }
      if (!PASSWORD_POLICY.test(password)) {
        Alert.alert(
          'Weak Password',
          'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
        );
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
        Alert.alert('Welcome Back!', 'You have logged in successfully');
      } else {
        await register(name, email, password, confirmPassword);
        await loginWithEmail(email, password);
        Alert.alert('Account Created', 'Welcome to Celebs Fashion!');
      }
    } catch (err: unknown) {
      const apiError = err as {
        message?: string;
        statusCode?: number;
        errors?: { field?: string; message?: string }[];
      };
      const reasons = Array.isArray(apiError?.errors)
        ? apiError.errors
            .map((issue) => issue?.message)
            .filter((msg): msg is string => Boolean(msg))
            .join('\n')
        : '';
      Alert.alert(
        apiError?.statusCode === 400 ? 'Check Your Details' : 'Authentication Error',
        reasons || apiError?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.black} />
      </ThemedView>
    );
  }

  // --- LOGGED IN USER PROFILE ---
  if (isLoggedIn && user) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // Clear the absolute-positioned tab bar (56 content height, see (tabs)/_layout)
            { paddingBottom: insets.bottom + TAB_BAR_CONTENT_HEIGHT + Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Info Header */}
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

          {/* Account menu */}
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

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <LogOut size={17} color={Palette.danger} />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    );
  }

  // --- LOGGED OUT AUTHENTICATION FORM ---
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

        {/* REAL GOOGLE SIGN IN BUTTON */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleRealGoogleSignIn}
          disabled={isAuthenticating || isSubmitting}
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

        {/* Tab Toggle */}
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

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {authMode === 'register' && (
            <View style={styles.inputWrapper}>
              <User size={18} color={Palette.gray400} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor={Palette.gray400}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Mail size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Email Address"
              placeholderTextColor={Palette.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 8, Aa1! special char)"
          />

          {authMode === 'register' && (
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
            />
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitForm}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={authMode === 'login' ? 'Sign in' : 'Create account'}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Palette.white} />
            ) : (
              <ThemedText style={styles.submitBtnText}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
