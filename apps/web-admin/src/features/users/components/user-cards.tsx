import type { UserData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

interface UserCardsProps {
  users: UserData[];
  onDelete: (user: { id: string; name?: string }) => void;
  isDeletePending: boolean;
}

/** Mobile users list — cards below md, paired with UserTable. */
export function UserCards({ users, onDelete, isDeletePending }: UserCardsProps) {
  if (users.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState title="No user accounts found." />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {users.map((account) => (
        <Card key={account.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {account.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">{account.email}</div>
            </div>
            <Badge className="shrink-0 bg-primary/10 text-primary">{account.role}</Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant={account.isEmailVerified ? 'success' : 'warning'}>
              {account.isEmailVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>

          <Button
            variant="destructive"
            className="h-10 w-full"
            onClick={() => onDelete({ id: account.id, name: account.name })}
            disabled={isDeletePending}
          >
            Delete
          </Button>
        </Card>
      ))}
    </div>
  );
}
