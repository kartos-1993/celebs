import { HTMLAttributes } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
import { setupSuperadminSchema } from '@celebs/shared-types';
import { setupSuperadminMutationFn } from '@/lib/api';

type SetupSuperadminFormProps = HTMLAttributes<HTMLDivElement>;

type FormValues = z.infer<typeof setupSuperadminSchema>;

export function SetupSuperadminForm({ className, ...props }: SetupSuperadminFormProps) {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: setupSuperadminMutationFn,
    meta: { suppressErrorToast: true },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(setupSuperadminSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      setupSecret: '',
    },
  });

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => {
        // Redirect to login page
        navigate('/login', { state: { successMessage: 'Superadmin setup completed successfully! You can now log in.' } });
      },
      onError: (error: any) => {
        const errorMsg = error?.response?.data?.message || error?.message || 'Failed to complete setup';
        form.setError('setupSecret', {
          type: 'server',
          message: errorMsg,
        });
      },
    });
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email Address</FormLabel>
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
                    <PasswordInput placeholder="Enter a secure password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="setupSecret"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Setup Secret Key</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Enter the setup secret key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2" type="submit" disabled={isPending}>
              {isPending ? 'Setting up...' : 'Setup Superadmin'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
