import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react-native';

import { loginSchema, type loginType } from '@celebs/shared-types';

import { styles } from '../styles/profile.styles';

import { PasswordInput } from '@/components/password-input';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';

export function LoginForm() {
  const { loginWithEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<loginType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: loginType) => {
    setIsSubmitting(true);
    try {
      await loginWithEmail(data.email, data.password);
      showToast('Welcome back! Logged in successfully', { type: 'success' });
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      showToast(apiError?.message || 'Invalid email or password', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputWrapper}>
        <Mail size={18} color={Palette.gray400} style={styles.inputIcon} />
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={styles.textInput}
              placeholder="Email Address"
              placeholderTextColor={Palette.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </View>
      {!!errors.email && (
        <ThemedText style={styles.fieldErrorText}>{errors.email.message}</ThemedText>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <PasswordInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Password"
          />
        )}
      />
      {!!errors.password && (
        <ThemedText style={styles.fieldErrorText}>{errors.password.message}</ThemedText>
      )}

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        {isSubmitting ? (
          <ActivityIndicator color={Palette.white} />
        ) : (
          <ThemedText style={styles.submitBtnText}>Sign In</ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}
