import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  Heart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';
import { useGoogleAuth } from '@/features/auth/hooks/use-google-auth';
import { styles } from '@/features/auth/styles/profile.styles';

export default function MeScreen() {
  const { user, isLoggedIn, isLoading, loginWithEmail, register, logout } = useAuth();
  const { signInWithGoogle, isAuthenticating } = useGoogleAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const handleSubmitForm = async () => {
    if (!email || !password || (authMode === 'register' && !name)) {
      Alert.alert('Missing Fields', 'Please fill out all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
        Alert.alert('Welcome Back!', 'You have logged in successfully');
      } else {
        await register(name, email, password);
        await loginWithEmail(email, password);
        Alert.alert('Account Created', 'Welcome to Celebs Fashion!');
      }
    } catch (err: unknown) {
      Alert.alert(
        'Authentication Error',
        (err as { message?: string })?.message || 'Authentication failed',
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* User Info Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarBadge}>
              <ThemedText style={styles.avatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </ThemedText>
            </View>

            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.userName}>
                {user.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.userEmail}>
                {user.email}
              </ThemedText>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color={Palette.success} />
                <ThemedText style={styles.verifiedText}>Verified Customer</ThemedText>
              </View>
            </View>
          </View>

          {/* Quick Action Grid */}
          <View style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>MY ACCOUNT</ThemedText>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/orders')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: Palette.successTint }]}>
                  <ShoppingBag size={20} color={Palette.success} />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>My Orders</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Track active deliveries & order history
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color={Palette.gray400} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/checkout')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: Palette.brandTint }]}>
                  <MapPin size={20} color={Palette.brand} />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>Shipping Addresses</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Kathmandu Valley & delivery locations
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color={Palette.gray400} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: Palette.dangerTint }]}>
                  <Heart size={20} color={Palette.danger} />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>Saved Wishlist</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Favorites and saved fashion items
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color={Palette.gray400} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color={Palette.danger} />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    );
  }

  // --- LOGGED OUT AUTHENTICATION FORM ---
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.authBanner}>
          <User size={42} color={Palette.black} strokeWidth={1.8} />
          <ThemedText type="subtitle" style={styles.authTitle}>
            Welcome to Celebs
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.authSub}>
            Sign in to track orders, save shipping addresses, and sync your cart.
          </ThemedText>
        </View>

        {/* REAL GOOGLE SIGN IN BUTTON */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleRealGoogleSignIn}
          disabled={isAuthenticating || isSubmitting}
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

          <View style={styles.inputWrapper}>
            <Lock size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={Palette.gray400}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitForm}
            disabled={isSubmitting}
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
