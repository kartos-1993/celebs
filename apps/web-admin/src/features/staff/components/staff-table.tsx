import { MailWarning, Pencil, Trash2 } from 'lucide-react';

import type { UserData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { RowActionsMenu } from '@/components/row-actions-menu';

interface StaffTableProps {
  staff: UserData[];
  isAdminOrSuperAdmin: boolean;
  onEdit: (member: UserData) => void;
  onDelete: (member: UserData) => void;
  isDeletePending: boolean;
  renderResendInvite: (email: string) => React.ReactNode;
}

/** Desktop staff table — hidden below md, paired with StaffCards. */
export function StaffTable({
  staff,
  isAdminOrSuperAdmin,
  onEdit,
  onDelete,
  isDeletePending,
  renderResendInvite,
}: StaffTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
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
            staff.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/30">
                <TableCell className="text-sm font-semibold text-foreground">
                  {member.name}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {member.email}
                </TableCell>
                {isAdminOrSuperAdmin && (
                  <TableCell className="text-sm font-medium text-foreground">
                    {member.vendorProfile?.shopName || 'Vendor Shop'}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(member.permissions) && member.permissions.length > 0 ? (
                      member.permissions
                        .slice(0, 4)
                        .map((perm: string) => (
                          <Badge key={perm} variant="outline" className="px-1.5 py-0 font-mono">
                            {perm}
                          </Badge>
                        ))
                    ) : (
                      <Badge variant="secondary">Staff Sub-User</Badge>
                    )}
                    {Array.isArray(member.permissions) && member.permissions.length > 4 && (
                      <Badge variant="secondary" className="px-1 py-0 font-mono">
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
                          <MailWarning aria-hidden="true" className="mr-1 inline h-3 w-3" />
                          Unverified
                        </Badge>
                        {renderResendInvite(member.email)}
                      </div>
                    )}
                    <RowActionsMenu
                      label={`Actions for ${member.name}`}
                      items={[
                        { label: 'Edit permissions', icon: Pencil, onSelect: () => onEdit(member) },
                        {
                          label: 'Delete staff',
                          icon: Trash2,
                          onSelect: () => onDelete(member),
                          disabled: isDeletePending,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
