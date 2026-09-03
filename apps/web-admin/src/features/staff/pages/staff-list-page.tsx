import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Layers,
  Package,
  Receipt,
  Send,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserPlus,
} from 'lucide-react';
import { z } from 'zod';

import { getGroupedPermissions, Permission, STAFF_ROLE_PRESETS } from '@celebs/rbac';
import type { UserData } from '@celebs/shared-types';
import { createStaffSchema } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
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
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { PasswordInput } from '@celebs/shared-ui/components/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { createStaff, deleteStaff, getStaff, updateStaff } from '../api';
import { STAFF_QUERY_KEYS } from '../api';
import { StaffCards } from '../components/staff-cards';
import { StaffTable } from '../components/staff-table';

import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';
import { PageLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';
import { resendVerification } from '@/features/auth/api';
import { getAdminVendors } from '@/features/vendors/api';
import { VENDORS_QUERY_KEYS } from '@/features/vendors/api';
import { useToast } from '@/hooks/use-toast';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  layers: Layers,
  'shopping-cart': ShoppingCart,
  receipt: Receipt,
  'shield-check': ShieldCheck,
  truck: Truck,
  settings: Shield,
};

type FormValues = z.infer<typeof createStaffSchema>;

function GroupedPermissionSelector({
  selected,
  onChange,
  isAdmin = false,
}: {
  selected: string[];
  onChange: (permissions: string[]) => void;
  isAdmin?: boolean;
}) {
  const allGroups = getGroupedPermissions();

  const togglePermission = (perm: string) => {
    if (selected.includes(perm)) {
      onChange(selected.filter((p) => p !== perm));
    } else {
      onChange([...selected, perm]);
    }
  };

  const toggleGroup = (groupPerms: Permission[]) => {
    const allSelected = groupPerms.every((p) => selected.includes(p));
    if (allSelected) {
      onChange(selected.filter((p) => !groupPerms.includes(p as Permission)));
    } else {
      const merged = new Set([...selected, ...groupPerms]);
      onChange(Array.from(merged));
    }
  };

  const visibleGroups = allGroups.filter((g) => isAdmin || g.module.key !== 'PLATFORM');

  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => {
        const GroupIcon = ICON_MAP[group.module.iconKey] || Shield;
        const groupPerms = group.permissions.map((p) => p.perm);
        const allGroupSelected =
          groupPerms.length > 0 && groupPerms.every((p) => selected.includes(p));

        return (
          <div
            key={group.module.key}
            className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-muted text-foreground">
                  <GroupIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">{group.module.label}</h4>
                  <p className="text-xs text-muted-foreground">{group.module.description}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleGroup(groupPerms)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {allGroupSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
              {group.permissions.map(({ perm, label, description }) => {
                const isChecked = selected.includes(perm);
                return (
                  <label
                    key={perm}
                    className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/60 hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => togglePermission(perm)}
                      className="h-3.5 w-3.5 mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground block leading-none">
                        {label}
                      </span>
                      <span className="block text-xs leading-tight text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  const [staffToDelete, setStaffToDelete] = useState<UserData | null>(null);
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
                <Select
                  value={selectedVendorFilter || 'ALL'}
                  onValueChange={(value) => {
                    const next = value === 'ALL' ? undefined : value;
                    setSelectedVendorFilter(next);
                    setTargetVendorForCreate(next);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs">
                    <SelectValue placeholder="All Vendor Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Vendor Shops</SelectItem>
                    {vendorsList.map((v: { id: string; shopName: string }) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Sub-Account
            </Button>
          </>
        }
      />

      {showCreateModal && (
        <Dialog open onOpenChange={(open) => !open && setShowCreateModal(false)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Vendor Staff Account</DialogTitle>
              <DialogDescription>
                Create a delegated sub-account for an existing vendor shop.
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                className="space-y-4"
              >
                {isAdminOrSuperAdmin && (
                  <div className="space-y-1">
                    <Label>Target Vendor Shop</Label>
                    <Select
                      value={targetVendorForCreate || selectedVendorFilter || ''}
                      onValueChange={(value) => setTargetVendorForCreate(value)}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Vendor Shop..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vendorsList.map(
                          (v: { id: string; shopName: string; user?: { email?: string } }) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.shopName} ({v.user?.email || 'Vendor'})
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
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
                  <FormLabel className="block">
                    Select Delegated Role Preset &amp; Permissions
                  </FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STAFF_ROLE_PRESETS.map((preset) => {
                      const PresetIcon = ICON_MAP[preset.iconKey] || Shield;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setSelectedPreset(preset.id);
                            setSelectedPermissions(preset.permissions);
                          }}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                            selectedPreset === preset.id
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-muted text-foreground shrink-0 mt-0.5">
                              <PresetIcon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="block text-sm font-semibold text-foreground">
                                {preset.label}
                              </span>
                              <span className="block text-xs leading-tight text-muted-foreground">
                                {preset.description}
                              </span>
                            </div>
                          </div>
                          {selectedPreset === preset.id && (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5 ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Granular Grouped Permission Customization */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="block font-semibold">Granular Capability Selection</Label>
                      <span className="text-xs text-muted-foreground">
                        {selectedPermissions.length} capabilities selected
                      </span>
                    </div>
                    <GroupedPermissionSelector
                      selected={selectedPermissions}
                      onChange={(perms) => {
                        setSelectedPreset('custom');
                        setSelectedPermissions(perms);
                      }}
                      isAdmin={isAdminOrSuperAdmin}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs mt-4"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? 'Creating Staff Account...'
                    : 'Create Staff Sub-Account'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Staff Permissions Modal */}
      {editingStaff && (
        <Dialog open onOpenChange={(open) => !open && setEditingStaff(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Staff Permissions</DialogTitle>
              <DialogDescription>
                {editingStaff.name} ({editingStaff.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="block font-semibold">Assigned Granular Capabilities</Label>
                <span className="text-xs text-muted-foreground">
                  {editPermissions.length} capabilities active
                </span>
              </div>

              <GroupedPermissionSelector
                selected={editPermissions}
                onChange={setEditPermissions}
                isAdmin={isAdminOrSuperAdmin}
              />

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditingStaff(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({ id: editingStaff.id, permissions: editPermissions })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <StaffTable
        staff={staff}
        isAdminOrSuperAdmin={isAdminOrSuperAdmin}
        onEdit={(member) => {
          setEditingStaff(member);
          setEditPermissions(
            Array.isArray(member.permissions) ? (member.permissions as string[]) : [],
          );
        }}
        onDelete={(member) => setStaffToDelete(member)}
        isDeletePending={deleteMutation.isPending}
        renderResendInvite={(email) => <ResendStaffInviteButton email={email} />}
      />
      <StaffCards
        staff={staff}
        isAdminOrSuperAdmin={isAdminOrSuperAdmin}
        onEdit={(member) => {
          setEditingStaff(member);
          setEditPermissions(
            Array.isArray(member.permissions) ? (member.permissions as string[]) : [],
          );
        }}
        onDelete={(member) => setStaffToDelete(member)}
        isDeletePending={deleteMutation.isPending}
        renderResendInvite={(email) => <ResendStaffInviteButton email={email} />}
      />

      <ConfirmDialog
        open={staffToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setStaffToDelete(null);
        }}
        destructive
        confirmLabel="Delete staff"
        title={`Delete ${staffToDelete?.name || 'this staff member'}?`}
        description="The account will lose access immediately. This action cannot be undone."
        onConfirm={() =>
          new Promise<void>((resolve, reject) => {
            if (!staffToDelete) return reject(new Error('Nothing to delete'));
            deleteMutation.mutate(staffToDelete.id, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            });
          })
        }
      />
    </div>
  );
}
