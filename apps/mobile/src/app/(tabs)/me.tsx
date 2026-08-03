import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Mail,
  Lock,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';

export default function MeScreen() {
  const { user, isLoggedIn, isLoading, loginWithGoogle, loginWithEmail, register, logout } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Google 1-Tap Sign In
  const handleGoogleSignIn = async (demoAccount?: { email: string; name: string }) => {
    setIsSubmitting(true);
    try {
      const googleUser = demoAccount || {
        email: 'alex.kathmandu@gmail.com',
        name: 'Alex Shrestha',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        googleId: 'google_109283749182374',
      };

      await loginWithGoogle(googleUser);
      Alert.alert('Welcome!', `Logged in successfully as ${googleUser.name}`);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err?.message || 'Could not complete Google sign in');
    } finally {
      setIsSubmitting(false);
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
        // Auto-login after registration
        await loginWithEmail(email, password);
        Alert.alert('Account Created', 'Welcome to Celebs Fashion!');
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err?.message || 'Authentication failed');
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
        <ActivityIndicator size="large" color="#000000" />
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
                <ShieldCheck size={14} color="#16a34a" />
                <ThemedText style={styles.verifiedText}>Verified Customer</ThemedText>
              </View>
            </View>
          </View>

          {/* Quick Action Grid */}
          <View style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>MY ACCOUNT</ThemedText>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/orders')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <ShoppingBag size={20} color="#16a34a" />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>My Orders</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Track active deliveries & order history
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color="#999999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/checkout')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                  <MapPin size={20} color="#2563eb" />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>Shipping Addresses</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Kathmandu Valley & delivery locations
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color="#999999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
                  <Heart size={20} color="#dc2626" />
                </View>
                <View>
                  <ThemedText style={styles.menuItemTitle}>Saved Wishlist</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.menuItemSub}>
                    Favorites and saved fashion items
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={18} color="#999999" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#dc2626" />
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
          <User size={42} color="#000000" strokeWidth={1.8} />
          <ThemedText type="subtitle" style={styles.authTitle}>
            Welcome to Celebs
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.authSub}>
            Sign in to track orders, save shipping addresses, and sync your cart.
          </ThemedText>
        </View>

        {/* 1-TAP GOOGLE SIGN IN BUTTON */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => handleGoogleSignIn()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
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
            <ThemedText style={[styles.tabToggleText, authMode === 'login' && styles.tabToggleTextActive]}>
              Log In
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, authMode === 'register' && styles.tabToggleActive]}
            onPress={() => setAuthMode('register')}
          >
            <ThemedText style={[styles.tabToggleText, authMode === 'register' && styles.tabToggleTextActive]}>
              Register
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {authMode === 'register' && (
            <View style={styles.inputWrapper}>
              <User size={18} color="#888888" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="#999999"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Mail size={18} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Email Address"
              placeholderTextColor="#999999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={18} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#999999"
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
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.submitBtnText}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Accounts */}
        <View style={styles.demoBox}>
          <ThemedText style={styles.demoTitle}>QUICK DEMO ACCESSS</ThemedText>
          <TouchableOpacity
            style={styles.demoItemBtn}
            onPress={() =>
              handleGoogleSignIn({
                email: 'customer.nepal@celebs.com',
                name: 'Suman Adhikari (Kathmandu)',
              })
            }
          >
            <ThemedText style={styles.demoItemText}>⚡ 1-Tap Demo User (Kathmandu Customer)</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    borderRadius: 16,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: Spacing.three,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: Spacing.three,
    borderRadius: 12,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
  authBanner: {
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  authSub: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
    paddingHorizontal: Spacing.four,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: Spacing.four,
    gap: 10,
    elevation: 1,
  },
  googleGLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 12,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    marginBottom: Spacing.three,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabToggleActive: {
    backgroundColor: '#ffffff',
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabToggleTextActive: {
    color: '#0f172a',
  },
  formContainer: {
    gap: Spacing.three,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoBox: {
    marginTop: Spacing.five,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  demoItemBtn: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
  },
  demoItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});
