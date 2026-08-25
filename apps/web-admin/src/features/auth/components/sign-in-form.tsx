import { HTMLAttributes, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Send } from 'lucide-react';
import { z } from 'zod';

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

import { login, resendVerification } from '../api';

import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';
import { getUserSession } from '@/features/account/api';
import { ACCOUNT_QUERY_KEYS } from '@/features/account/api';
import { cn } from '@/lib/utils';

type SignInFormProps = HTMLAttributes<HTMLDivElement>;

function ResendBannerButton({ email }: { email: string }) {
  const [status, setStatus] = useState<{ loading: boolean; message?: string; error?: string }>({
    loading: false,
  });
  const { secondsRemaining, isCoolingDown, startCooldown } = useResendCooldown(
    'login_resend_cooldown',
    60,
  );

  const handleResend = async () => {
    if (!email || isCoolingDown) return;
    setStatus({ loading: true });
    try {
      await resendVerification({ email });
      startCooldown();
      setStatus({
        loading: false,
        message: 'Fresh activation email sent! Please check your inbox.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend email';
      setStatus({ loading: false, error: msg });
    }
  };

  if (status.message) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success font-medium pt-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{status.message}</span>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={status.loading || isCoolingDown || !email}
        onClick={handleResend}
        className="text-xs h-8 w-full gap-1.5"
      >
        {status.loading ? (
          <>
            <Spinner size="sm" /> Resending Link...
          </>
        ) : isCoolingDown ? (
          <>Resend Link in {secondsRemaining}s...</>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" /> Resend Verification Link
          </>
        )}
      </Button>
      {status.error && <div className="text-xs text-destructive pt-1">{status.error}</div>}
    </div>
  );
}

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' })
    .email({ message: 'Invalid email address' }),
  password: z.string().min(1, {
    message: 'Please enter your password',
  }),
});

export function SignInForm({ className, ...props }: SignInFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: login,
    meta: { suppressErrorToast: true },
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const queryClient = useQueryClient();

  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (serverError) {
        setServerError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, serverError]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setServerError(null);
    try {
      const response = await mutateAsync(values);
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
      const errObj = error as {
        message?: string;
        errors?: Array<{ field?: keyof z.infer<typeof formSchema>; message?: string }>;
      };
      if (errObj?.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
        errObj.errors.forEach((err) => {
          if (err.field) {
            form.setError(err.field, {
              type: 'server',
              message: err.message,
            });
          }
        });
      } else if (errObj?.message) {
        setServerError(errObj.message);
      } else {
        setServerError('Invalid email or password');
      }
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
        <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-2 space-y-2">
          <div>{serverError}</div>
          {(serverError.toLowerCase().includes('verify') ||
            serverError.toLowerCase().includes('unverified')) && (
            <ResendBannerButton email={form.getValues('email')} />
          )}
        </div>
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
