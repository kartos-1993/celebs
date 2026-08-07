import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStaffQueryFn, createStaffMutationFn, deleteStaffMutationFn } from '@/lib/api';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { createStaffSchema } from '@celebs/shared-types';

type FormValues = z.infer<typeof createStaffSchema>;

export default function StaffList() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['vendor-staff'],
    queryFn: getStaffQueryFn,
  });

  const createMutation = useMutation({
    mutationFn: createStaffMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-staff'] });
      setShowCreateModal(false);
      createForm.reset();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to create staff';
      createForm.setError('confirmPassword', {
        type: 'server',
        message: errorMsg,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-staff'] });
    },
  });

  const createForm = useForm<FormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading staff...</div>;
  }

  const staff = response?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>Add Staff</Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Add Staff Account</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>✕</Button>
            </div>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="staff@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="Repeat password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Staff'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-sm font-medium">
              <th className="p-4">Name</th>
              <th className="p-4">Email Address</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                  No staff members added yet.
                </td>
              </tr>
            ) : (
              staff.map((member: any) => (
                <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{member.name}</td>
                  <td className="p-4">{member.email}</td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this staff member?')) {
                          deleteMutation.mutate(member.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
