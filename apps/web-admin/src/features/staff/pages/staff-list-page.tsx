import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStaffQueryFn, createStaffMutationFn, deleteStaffMutationFn } from '@/lib/api';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import { createStaffSchema } from '@celebs/shared-types';
import { Shield, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';
import { Permission } from '@celebs/rbac';

type FormValues = z.infer<typeof createStaffSchema>;

const STAFF_ROLE_PRESETS = [
  {
    id: 'inventory',
    label: '📦 Product & Inventory Lead',
    description: 'Can manage products, add new items, and update media center.',
    permissions: [Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_EDIT, Permission.PRODUCT_DELETE],
  },
  {
    id: 'fulfillment',
    label: '🚚 Order Fulfillment Agent',
    description: 'Can view and update order status, manage returns and customer reviews.',
    permissions: [Permission.ORDER_VIEW, Permission.ORDER_MANAGE, Permission.PRODUCT_VIEW],
  },
  {
    id: 'accountant',
    label: '💰 Finance Accountant',
    description: 'Can view shop earnings, payout reports, and financial statements.',
    permissions: [Permission.FINANCE_VIEW, Permission.ORDER_VIEW],
  },
  {
    id: 'full_manager',
    label: '⚡ Full Shop Manager',
    description: 'Has full operational access to products, orders, reviews, and finance.',
    permissions: [
      Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_EDIT, Permission.PRODUCT_DELETE,
      Permission.ORDER_VIEW, Permission.ORDER_MANAGE, Permission.FINANCE_VIEW, Permission.CATALOG_VIEW,
    ],
  },
];

export default function StaffList() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('inventory');

  const { data: response, isLoading } = useQuery({
    queryKey: ['vendor-staff'],
    queryFn: getStaffQueryFn,
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const preset = STAFF_ROLE_PRESETS.find((p) => p.id === selectedPreset);
      return createStaffMutationFn({
        ...values,
        permissions: preset?.permissions || [],
      } as any);
    },
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Vendor Staff & Delegated Sub-Users
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Hire employees, assign role presets, and delegate specific shop permissions (Daraz Seller Staff Model).
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Staff Sub-User
        </Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold">Add Vendor Staff Account</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>✕</Button>
            </div>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter staff name (e.g. Rahul Sharma)" {...field} className="text-sm" />
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
                      <FormLabel className="text-xs">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="staff@example.com" {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" {...field} className="text-sm" />
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
                        <FormLabel className="text-xs">Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Repeat password" {...field} className="text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role Preset Selector */}
                <div className="space-y-2 border-t pt-3">
                  <FormLabel className="text-xs font-semibold block">Select Delegated Role Preset & Permissions</FormLabel>
                  <div className="grid grid-cols-1 gap-2">
                    {STAFF_ROLE_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                          selectedPreset === preset.id
                            ? 'border-primary bg-primary/5 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-foreground block">{preset.label}</span>
                          <span className="text-[11px] text-muted-foreground">{preset.description}</span>
                        </div>
                        {selectedPreset === preset.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating Staff Account...' : 'Create Staff Account'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-card shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
              <th className="p-3.5">Staff Name</th>
              <th className="p-3.5">Email Address</th>
              <th className="p-3.5">Assigned Role</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-xs text-muted-foreground">
                  No staff members created yet. Click "Add Staff Sub-User" to hire employee accounts.
                </td>
              </tr>
            ) : (
              staff.map((member: any) => (
                <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-bold text-sm text-foreground">{member.name}</td>
                  <td className="p-3.5 text-xs text-muted-foreground font-mono">{member.email}</td>
                  <td className="p-3.5">
                    <Badge variant="secondary" className="text-xs font-normal">
                      Staff Sub-User
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this staff member?')) {
                          deleteMutation.mutate(member.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 gap-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
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
