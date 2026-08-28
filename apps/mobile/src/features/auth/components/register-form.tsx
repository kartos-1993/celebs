import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User } from 'lucide-react-native';

import { registerSchema, type registerType } from '@celebs/shared-types';

import { styles } from '../styles/profile.styles';

import { PasswordInput } from '@/components/password-input';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast/toast';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/auth-context';

export function RegisterForm() {
  const { register, loginWithEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<registerType>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: registerType) => {
    setIsSubmitting(true);
    try {
      await register(data.name, data.email, data.password, data.confirmPassword);
      await loginWithEmail(data.email, data.password);
      showToast('Welcome to Celebs Fashion!', { type: 'success' });
    } catch (err: unknown) {
      const apiError = err as {
        message?: string;
        errors?: { field?: string; message?: string }[];
      };
      const reasons = Array.isArray(apiError?.errors)
        ? apiError.errors
            .map((issue) => issue?.message)
            .filter((msg): msg is string => Boolean(msg))
            .join(' · ')
        : '';
      showToast(reasons || apiError?.message || 'Registration failed. Please try again.', {
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputWrapper}>
        <User size={18} color={Palette.gray400} style={styles.inputIcon} />
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor={Palette.gray400}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
      </View>
      {!!errors.name && (
        <ThemedText style={styles.fieldErrorText}>{errors.name.message}</ThemedText>
      )}

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
            placeholder="Password (min 8, Aa1! special char)"
          />
        )}
      />
      {!!errors.password && (
        <ThemedText style={styles.fieldErrorText}>{errors.password.message}</ThemedText>
      )}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange, onBlur } }) => (
          <PasswordInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Confirm Password"
          />
        )}
      />
      {!!errors.confirmPassword && (
        <ThemedText style={styles.fieldErrorText}>{errors.confirmPassword.message}</ThemedText>
      )}

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Create account"
      >
        {isSubmitting ? (
          <ActivityIndicator color={Palette.white} />
        ) : (
          <ThemedText style={styles.submitBtnText}>Create Account</ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}
