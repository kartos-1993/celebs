import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  MailWarning,
  Package,
  Pencil,
  Receipt,
  Send,
  Shield,
  ShieldCheck,
  Store,
  Trash2,
  Truck,
  UserPlus,
} from 'lucide-react';
import { z } from 'zod';

import { Permission } from '@celebs/rbac';
import type { UserData } from '@celebs/shared-types';
import { createStaffSchema } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
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
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { createStaff, deleteStaff, getStaff, updateStaff } from '../api';
import { STAFF_QUERY_KEYS } from '../api';

import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';
import { PageLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';
import { resendVerification } from '@/features/auth/api';
import { getAdminVendors } from '@/features/vendors/api';
import { VENDORS_QUERY_KEYS } from '@/features/vendors/api';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_STAFF_PERMISSIONS = [
  { perm: Permission.PRODUCT_VIEW, label: 'View Products' },
  { perm: Permission.PRODUCT_CREATE, label: 'Create Products' },
  { perm: Permission.PRODUCT_EDIT, label: 'Edit Products' },
  { perm: Permission.PRODUCT_DELETE, label: 'Delete Products' },
  { perm: Permission.CATALOG_VIEW, label: 'View Catalog Setup' },
  { perm: Permission.ORDER_VIEW, label: 'View Orders & Reviews' },
  { perm: Permission.ORDER_MANAGE, label: 'Manage & Fulfill Orders' },
  { perm: Permission.FINANCE_VIEW, label: 'View Finance Reports' },
  { perm: Permission.STAFF_VIEW, label: 'View Staff Roster' },
];

type FormValues = z.infer<typeof createStaffSchema>;

const STAFF_ROLE_PRESETS = [
  {
    id: 'inventory',
    label: 'Product & Inventory Lead',
    description: 'Can manage products, add new items, and update media center.',
    icon: Package,
    permissions: [
      Permission.PRODUCT_VIEW,
      Permission.PRODUCT_CREATE,
      Permission.PRODUCT_EDIT,
      Permission.PRODUCT_DELETE,
    ],
  },
  {
    id: 'fulfillment',
    label: 'Order Fulfillment Agent',
    description: 'Can view and update order status, manage returns and customer reviews.',
    icon: Truck,
    permissions: [Permission.ORDER_VIEW, Permission.ORDER_MANAGE, Permission.PRODUCT_VIEW],
  },
  {
    id: 'accountant',
    label: 'Finance Accountant',
    description: 'Can view shop earnings, payout reports, and financial statements.',
    icon: Receipt,
    permissions: [Permission.FINANCE_VIEW, Permission.ORDER_VIEW],
  },
  {
    id: 'full_manager',
    label: 'Full Shop Manager',
    description: 'Has full operational access to products, orders, reviews, and finance.',
    icon: ShieldCheck,
    permissions: [
      Permission.PRODUCT_VIEW,
      Permission.PRODUCT_CREATE,
      Permission.PRODUCT_EDIT,
      Permission.PRODUCT_DELETE,
      Permission.ORDER_VIEW,
      Permission.ORDER_MANAGE,
      Permission.FINANCE_VIEW,
      Permission.CATALOG_VIEW,
    ],
  },
];

function ResendStaffInviteButton({ email }: { email: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { secondsRemaining, isCoolingDown, startCooldown } = useResendCooldown(
    `staff_resend_${email}`,
    60,
  );

  const handleResend = async () => {
    if (isCoolingDown || loading) return;
    setLoading(true);
    try {
      await resendVerification({ email });
      startCooldown();
      toast({
        title: 'Invite Sent',
        description: `Verification & invite link sent to ${email}`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend invite';
      toast({
        variant: 'destructive',
        title: 'Resend Failed',
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading || isCoolingDown}
      onClick={handleResend}
      className="h-8 gap-1"
    >
      {loading ? (
        <Spinner size="sm" />
      ) : isCoolingDown ? (
        <span className="font-mono text-xs">{secondsRemaining}s</span>
      ) : (
        <>
          <Send className="w-3.5 h-3.5" /> Resend Invite
        </>
      )}
    </Button>
  );
}

export default function StaffList() {
  const queryClient = useQueryClient();
  const { role } = useAuthContext();
  const isAdminOrSuperAdmin = role === 'SUPERADMIN' || role === 'ADMIN';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('inventory');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    STAFF_ROLE_PRESETS[0].permissions,
  );
  const [editingStaff, setEditingStaff] = useState<UserData | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string | undefined>(undefined);
  const [targetVendorForCreate, setTargetVendorForCreate] = useState<string | undefined>(undefined);

  // Query vendors for Admin/Superadmin selector
  const { data: vendorsResponse } = useQuery({
    queryKey: VENDORS_QUERY_KEYS.list(),
    queryFn: getAdminVendors,
    enabled: isAdminOrSuperAdmin,
  });

  const vendorsList = vendorsResponse?.data || [];

  // Query staff list (filtered by selectedVendorFilter if admin)
  const { data: response, isLoading } = useQuery({
    queryKey: STAFF_QUERY_KEYS.list(selectedVendorFilter),
    queryFn: () => getStaff(selectedVendorFilter),
  });

  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: Record<string, unknown> = {
        ...values,
        permissions: selectedPermissions,
      };
      if (isAdminOrSuperAdmin && (targetVendorForCreate || selectedVendorFilter)) {
        payload.vendorId = targetVendorForCreate || selectedVendorFilter;
      }
      return createStaff(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEYS.all });
      setShowCreateModal(false);
      createForm.reset();
      toast({
        title: 'Success',
        description: 'Staff member account created successfully',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create staff account',
        description: error?.message || 'An unexpected error occurred',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateStaff(id, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEYS.all });
      setEditingStaff(null);
      toast({
        title: 'Success',
        description: 'Staff account permissions updated successfully',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update staff permissions',
        description: error?.message || 'An unexpected error occurred',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEYS.all });
      toast({
        title: 'Success',
        description: 'Staff account deleted successfully',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete staff account',
        description: error?.message || 'An unexpected error occurred',
      });
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
    return <PageLoader />;
  }

  const staff = response?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Vendor Staff &amp; Sub-Accounts
          </span>
        }
        description={
          'Delegate specialized store permissions to employee accounts (Daraz Seller Sub-Account Model).'
        }
        actions={
          <>
            {isAdminOrSuperAdmin && vendorsList.length > 0 && (
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedVendorFilter || ''}
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    setSelectedVendorFilter(val);
                    setTargetVendorForCreate(val);
                  }}
                  className="h-9 px-3 py-1 rounded-md border border-input bg-background text-xs shadow-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Vendor Shops</option>
                  {vendorsList.map((v: { id: string; shopName: string }) => (
                    <option key={v.id} value={v.id}>
                      {v.shopName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Sub-Account
            </Button>
          </>
        }
      />

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl shadow-lg max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-semibold text-foreground">Add Vendor Staff Account</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                ✕
              </Button>
            </div>

            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                className="space-y-4"
              >
                {isAdminOrSuperAdmin && (
                  <div className="space-y-1">
                    <Label>Target Vendor Shop</Label>
                    <select
                      value={targetVendorForCreate || selectedVendorFilter || ''}
                      onChange={(e) => setTargetVendorForCreate(e.target.value)}
                      className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background text-xs shadow-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
                      required
                    >
                      <option value="" disabled>
                        Select Vendor Shop...
                      </option>
                      {vendorsList.map(
                        (v: { id: string; shopName: string; user?: { email?: string } }) => (
                          <option key={v.id} value={v.id}>
                            {v.shopName} ({v.user?.email || 'Vendor'})
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter staff name" {...field} className="text-sm" />
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
                        <Input
                          type="email"
                          placeholder="staff@example.com"
                          {...field}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
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
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Repeat password"
                            {...field}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Role Preset Selector */}
                <div className="space-y-3 border-t pt-3">
                  <FormLabel className="block">Select Delegated Role Preset &amp; Permissions</FormLabel>
                  <div className="grid grid-cols-1 gap-2">
                    {STAFF_ROLE_PRESETS.map((preset) => {
                      const PresetIcon = preset.icon;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setSelectedPreset(preset.id);
                            setSelectedPermissions(preset.permissions);
                          }}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                            selectedPreset === preset.id
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-md bg-muted text-foreground shrink-0 mt-0.5">
                              <PresetIcon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground block">
                                {preset.label}
                              </span>
                              <span className="text-xs text-muted-foreground leading-tight block">
                                {preset.description}
                              </span>
                            </div>
                          </div>
                          {selectedPreset === preset.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Granular Permission Customization */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="block">Granular Capability Checkboxes</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_STAFF_PERMISSIONS.map(({ perm, label }) => {
                        const isChecked = selectedPermissions.includes(perm);
                        return (
                          <label
                            key={perm}
                            className="flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer hover:bg-muted/40 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedPreset('custom');
                                setSelectedPermissions((prev) =>
                                  isChecked ? prev.filter((p) => p !== perm) : [...prev, perm],
                                );
                              }}
                              className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="text-foreground">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? 'Creating Staff Account...'
                    : 'Create Staff Sub-Account'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}

      {/* Edit Staff Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Edit Staff Permissions</h3>
                <p className="text-xs text-muted-foreground">{editingStaff.name} ({editingStaff.email})</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingStaff(null)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="block">Assigned Granular Capabilities</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_STAFF_PERMISSIONS.map(({ perm, label }) => {
                  const isChecked = editPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setEditPermissions((prev) =>
                            isChecked ? prev.filter((p) => p !== perm) : [...prev, perm],
                          );
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="text-foreground">{label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditingStaff(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: editingStaff.id, permissions: editPermissions })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Staff Name</TableHead>
              <TableHead>Email Address</TableHead>
              {isAdminOrSuperAdmin && <TableHead>Associated Shop</TableHead>}
              <TableHead>Assigned Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminOrSuperAdmin ? 5 : 4}>
                  <EmptyState
                    title="No staff sub-accounts found."
                    description={'Click "Add Sub-Account" to delegate employee access.'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member: UserData) => (
                <TableRow key={member.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground">{member.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{member.email}</TableCell>
                  {isAdminOrSuperAdmin && (
                    <TableCell className="font-medium text-foreground">
                      {member.vendorProfile?.shopName || 'Vendor Shop'}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(member.permissions) && member.permissions.length > 0 ? (
                        member.permissions.slice(0, 4).map((perm: string) => (
                          <Badge
                            key={perm}
                            variant="outline"
                            className="py-0 px-1.5 font-mono"
                          >
                            {perm}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Staff Sub-User
                        </Badge>
                      )}
                      {Array.isArray(member.permissions) && member.permissions.length > 4 && (
                        <Badge variant="secondary" className="py-0 px-1 font-mono">
                          +{member.permissions.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                    {!member.isEmailVerified && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="warning">
                          <MailWarning className="w-3 h-3 mr-1 inline" /> Unverified
                        </Badge>
                        <ResendStaffInviteButton email={member.email} />
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingStaff(member);
                        setEditPermissions(Array.isArray(member.permissions) ? (member.permissions as string[]) : []);
                      }}
                      className="h-8 gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this staff member?')) {
                          deleteMutation.mutate(member.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
