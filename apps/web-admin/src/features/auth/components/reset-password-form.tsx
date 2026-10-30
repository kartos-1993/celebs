import { HTMLAttributes, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useResetPasswordMutation } from '../hooks/use-auth-mutations';
import { resetPasswordFormSchema, ResetPasswordFormValues } from '../types/password-reset.schema';

import { cn } from '@/lib/utils';

interface ResetPasswordFormProps extends HTMLAttributes<HTMLDivElement> {
  code: string | null;
}

export function ResetPasswordForm({ code, className, ...props }: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { mutateAsync: resetPasswordMutate, isPending } = useResetPasswordMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const isBusy = isPending || form.formState.isSubmitting;

  if (!code) {
    return (
      <div className={cn('grid gap-4', className)} {...props}>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Invalid or Missing Reset Link</p>
          <p className="mt-1 text-muted-foreground">
            This password reset link is invalid or incomplete. Please request a new link.
          </p>
        </div>
        <div className="text-center text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!code) return;
    setServerError(null);
    try {
      await resetPasswordMutate({
        verificationCode: code,
        password: values.password,
      });
      navigate('/login', {
        state: { successMessage: 'Your password has been reset successfully. Please log in.' },
      });
    } catch {
      setServerError('Failed to reset password. The link may have expired or is invalid.');
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      {serverError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" disabled={isBusy} type="submit">
              {isBusy ? <Spinner size="sm" /> : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Form>
      <div className="text-center text-sm">
        <Link
          to="/login"
          className="text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
