import { HTMLAttributes, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useLoginMutation } from '../hooks/use-auth-mutations';
import { signInFormSchema, SignInFormValues } from '../types/sign-in.schema';
import { handleSignInErrors } from '../utils/auth-error';

import { SignInErrorBanner } from './sign-in-error-banner';

import { getUserSession } from '@/features/account/api';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { cn } from '@/lib/utils';

type SignInFormProps = HTMLAttributes<HTMLDivElement>;

export function SignInForm({ className, ...props }: SignInFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;

  const { mutateAsync: loginMutate, isPending } = useLoginMutation();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (serverError) setServerError(null);
    });
    return () => subscription.unsubscribe();
  }, [form, serverError]);

  async function onSubmit(values: SignInFormValues) {
    setServerError(null);
    try {
      const response = await loginMutate(values);
      if (response.data?.mfaRequired) {
        navigate(`/verify-mfa?email=${values.email}`);
        return;
      }
      const sessionData = await getUserSession();
      queryClient.setQueryData(ACCOUNT_QUERY_KEYS.userSession(), sessionData);
      const searchParams = new URLSearchParams(location.search);
      const returnUrlParam = searchParams.get('returnUrl');
      const targetUrl = returnUrlParam ? decodeURIComponent(returnUrlParam) : '/';
      navigate(targetUrl, { replace: true });
    } catch (error: unknown) {
      handleSignInErrors(error, form.setError, setServerError);
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      {successMessage && (
        <div className="bg-success/10 border border-success/30 text-success p-3 rounded-md text-sm mb-2">
          {successMessage}
        </div>
      )}
      {serverError && (
        <SignInErrorBanner serverError={serverError} email={form.getValues('email')} />
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <div className="flex justify-end pt-0.5">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2" disabled={isPending}>
              {isPending && <Spinner size="sm" className="mr-2" />}
              Login
            </Button>
          </div>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground mt-2">
        Want to sell on Celebs?{' '}
        <Link to="/vendor/register" className="underline underline-offset-4 hover:text-primary">
          Register as a Vendor →
        </Link>
      </div>
    </div>
  );
}
