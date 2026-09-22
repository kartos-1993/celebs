import type { UserData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

interface UserTableProps {
  users: UserData[];
  onDelete: (user: { id: string; name?: string }) => void;
  isDeletePending: boolean;
}

/** Desktop users table — hidden below md, paired with UserCards. */
export function UserTable({ users, onDelete, isDeletePending }: UserTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
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
            users.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="max-w-44 truncate text-sm font-semibold tracking-tight leading-tight text-foreground">
                  {account.name}
                </TableCell>
                <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                  {account.email}
                </TableCell>
                <TableCell>
                  <Badge variant="primary">{account.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={account.isEmailVerified ? 'success' : 'warning'}>
                    {account.isEmailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 whitespace-nowrap px-2 text-xs"
                    onClick={() => onDelete({ id: account.id, name: account.name })}
                    disabled={isDeletePending}
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
  );
}
