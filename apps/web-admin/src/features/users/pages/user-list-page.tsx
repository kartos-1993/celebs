import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UserData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { Input } from '@celebs/shared-ui/components/input';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { createUser, deleteUser, getUsers } from '../api';
import { USERS_QUERY_KEYS } from '../api';

import { PageLoader } from '@/components/page-loader';

export default function UserList() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name?: string } | null>(null);

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
    return <PageLoader />;
  }

  const users = response?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts"
        actions={<Button onClick={() => setShowCreateModal(true)}>Create User</Button>}
      />

      {showCreateModal && (
        <Dialog open onOpenChange={(open) => !open && setShowCreateModal(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Provision an admin or customer account directly.
              </DialogDescription>
            </DialogHeader>

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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                            <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                          </SelectContent>
                        </Select>
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
          </DialogContent>
        </Dialog>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="No user accounts found." />
                </TableCell>
              </TableRow>
            ) : (
              users.map((account: UserData) => (
                <TableRow key={account.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary">{account.role}</Badge>
                  </TableCell>
                  <TableCell>{account.isEmailVerified ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setUserToDelete({ id: account.id, name: account.name })}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={userToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
        destructive
        confirmLabel="Delete user"
        title={`Delete ${userToDelete?.name || 'this user'}?`}
        description="The account will be permanently removed. This action cannot be undone."
        onConfirm={() =>
          new Promise<void>((resolve, reject) => {
            if (!userToDelete) return reject(new Error('Nothing to delete'));
            deleteMutation.mutate(userToDelete.id, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            });
          })
        }
      />
    </div>
  );
}
