import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getUsers, createUser, deleteUser } from '../api';
import { USERS_QUERY_KEYS } from '../api';
import type { UserData } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';

export default function UserList() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: USERS_QUERY_KEYS.list(),
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
      setShowCreateModal(false);
      createForm.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });

  const createForm = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'ADMIN',
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
  }

  const users = response?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">User Accounts</h1>
        <Button onClick={() => setShowCreateModal(true)}>Create User</Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Create New Account</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                ✕
              </Button>
            </div>

            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                className="space-y-4"
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                        <Input type="email" placeholder="john@example.com" {...field} />
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
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <select
                          className="w-full bg-background border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          {...field}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPERADMIN">SUPERADMIN</option>
                          <option value="CUSTOMER">CUSTOMER</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Account'}
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
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Verified</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No user accounts found.
                </td>
              </tr>
            ) : (
              users.map((account: UserData) => (
                <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{account.name}</td>
                  <td className="p-4">{account.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {account.role}
                    </span>
                  </td>
                  <td className="p-4">{account.isEmailVerified ? 'Yes' : 'No'}</td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this user?')) {
                          deleteMutation.mutate(account.id);
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
