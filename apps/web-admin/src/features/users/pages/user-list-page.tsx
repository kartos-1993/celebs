import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@celebs/shared-ui/components/button';
import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
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

import { createUser, deleteUser, getUsers } from '../api';
import { USERS_QUERY_KEYS } from '../api';
import { UserCards } from '../components/user-cards';
import { UserTable } from '../components/user-table';

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
          <DialogContent className="sm:max-w-md">
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

      <UserTable
        users={users}
        onDelete={(user) => setUserToDelete(user)}
        isDeletePending={deleteMutation.isPending}
      />
      <UserCards
        users={users}
        onDelete={(user) => setUserToDelete(user)}
        isDeletePending={deleteMutation.isPending}
      />

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
