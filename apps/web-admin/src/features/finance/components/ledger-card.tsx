import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { LedgerEntry } from '../api';

import { LedgerTable } from './ledger-table';

interface LedgerCardProps {
  entries: LedgerEntry[];
}

export function LedgerCard({ entries }: LedgerCardProps) {
  const isEmpty = entries.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ledger</CardTitle>
        <CardDescription>
          Append-only. Entries are never edited or deleted, only added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <EmptyState
            title="Nothing recorded yet"
            description="Ledger entries appear as orders and settlements are processed."
          />
        ) : (
          <LedgerTable entries={entries} />
        )}
      </CardContent>
    </Card>
  );
}
