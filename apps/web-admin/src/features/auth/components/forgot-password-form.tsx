import { HTMLAttributes, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useForgotPasswordMutation } from '../hooks/use-auth-mutations';
import { forgotPasswordFormSchema, ForgotPasswordFormValues } from '../types/password-reset.schema';

import { cn } from '@/lib/utils';

type ForgotPasswordFormProps = HTMLAttributes<HTMLDivElement>;

export function ForgotPasswordForm({ className, ...props }: ForgotPasswordFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync: forgotPasswordMutate, isPending } = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const isBusy = isPending || form.formState.isSubmitting;

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      await forgotPasswordMutate(values);
      setIsSubmitted(true);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn('grid gap-4', className)} {...props}>
        <div className="rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
          <p className="font-medium">Password Reset Link Sent</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for {form.getValues('email')}, you will receive a password reset
            link shortly.
          </p>
        </div>
        <div className="text-center text-sm">
          <Link
            to="/login"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
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
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" disabled={isBusy} type="submit">
              {isBusy ? <Spinner size="sm" /> : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Form>
      <div className="text-center text-sm">
        <Link
          to="/login"
          className="text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </div>
  );
}
