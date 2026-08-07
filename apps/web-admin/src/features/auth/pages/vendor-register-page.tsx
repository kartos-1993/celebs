import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { vendorRegisterSchema } from '@celebs/shared-types';
import { vendorRegisterMutationFn } from '@/lib/api';

type FormValues = z.infer<typeof vendorRegisterSchema>;

export function VendorRegisterPage() {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: vendorRegisterMutationFn,
    meta: { suppressErrorToast: true },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(vendorRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      shopName: '',
      panNumber: '',
      citizenshipNumber: '',
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (serverError) {
        setServerError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, serverError]);

  function onSubmit(values: FormValues) {
    setServerError(null);
    mutate(values, {
      onSuccess: () => {
        navigate('/login', {
          state: { successMessage: 'Vendor registered successfully! Check your email for verification link.' },
        });
      },
      onError: (error: any) => {
        const errorData = error?.response?.data || error;
        if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorData.errors.forEach((err: any) => {
            if (err.field) {
              form.setError(err.field as any, {
                type: 'server',
                message: err.message,
              });
            }
          });
        } else if (errorData?.message) {
          const msg = errorData.message.toLowerCase();
          if (msg.includes('email')) {
            form.setError('email', { type: 'server', message: errorData.message });
          } else if (msg.includes('shop')) {
            form.setError('shopName', { type: 'server', message: errorData.message });
          } else if (msg.includes('phone')) {
            form.setError('phoneNumber', { type: 'server', message: errorData.message });
          } else if (msg.includes('pan')) {
            form.setError('panNumber', { type: 'server', message: errorData.message });
          } else if (msg.includes('citizenship')) {
            form.setError('citizenshipNumber', { type: 'server', message: errorData.message });
          } else {
            setServerError(errorData.message);
          }
        } else {
          setServerError('Registration failed. Please try again.');
        }
      },
    });
  }

  return (
    <div className="container relative grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          CELEBS
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">Become a Seller on Celebs E-commerce Platform</p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8 overflow-y-auto max-h-screen py-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[400px]">
          <div className="flex flex-col space-y-1 text-left">
            <h1 className="text-2xl font-semibold tracking-tight">Register Vendor Profile</h1>
            <p className="text-sm text-muted-foreground">
              Submit your basic information to get started.
            </p>
          </div>

          {serverError && (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-2">
              {serverError}
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Owner Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter owner name" {...field} />
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
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="shopName"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Boutique" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="98XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9 digits" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="citizenshipNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Citizenship No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Citizenship No." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Create secure password" {...field} />
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
                      <PasswordInput placeholder="Repeat password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full mt-2" type="submit" disabled={isPending}>
                {isPending ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="underline underline-offset-4 hover:text-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VendorRegisterPage;
