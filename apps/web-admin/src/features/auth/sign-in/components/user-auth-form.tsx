import { HTMLAttributes, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
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
import { Button } from '@celebs/shared-ui/components/button';

import { loginMutationFn } from '@/lib/api';

type UserAuthFormProps = HTMLAttributes<HTMLDivElement>;

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' })
    .email({ message: 'Invalid email address' }),
  password: z.string().min(1, {
    message: 'Please enter your password',
  }),
});

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as any)?.successMessage;

  const { mutate, isPending } = useMutation({
    mutationFn: loginMutationFn,
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('login submitting');
    mutate(values, {
      onSuccess: (response) => {
        if (response.data?.mfaRequired) {
          navigate(`/verify-mfa?email=${values.email}`);
          return;
        }
        navigate('/');
      },
      onError: (error: any) => {
        console.log('login failure', error);
        if (error?.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            if (err.field) {
              form.setError(err.field as any, {
                type: 'server',
                message: err.message,
              });
            }
          });
        } else if (error?.message) {
          form.setError('password', {
            type: 'server',
            message: error.message,
          });
        }
      },
    });
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded text-sm mb-2">
          {successMessage}
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-muted-foreground hover:opacity-75"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2" disabled={isPending}>
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

