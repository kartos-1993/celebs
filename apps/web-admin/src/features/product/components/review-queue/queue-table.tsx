import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { QueueTableRow } from './queue-table-row';
import type { ProductQueueItem } from './types';

interface QueueTableProps {
  products: ProductQueueItem[];
  activeTab: string;
  isFetching: boolean;
  isReviewPending: boolean;
  onPreview: (product: ProductQueueItem) => void;
  onApprove: (id: string) => void;
  onReject: (product: ProductQueueItem) => void;
}

/** Desktop review-queue table — hidden below md, paired with QueueCards. */
export function QueueTable({
  products,
  activeTab,
  isFetching,
  isReviewPending,
  onPreview,
  onApprove,
  onReject,
}: QueueTableProps) {
  return (
    <div
      className={`hidden overflow-x-auto rounded-xl border bg-card shadow-sm transition-opacity md:block ${isFetching ? 'opacity-60' : ''}`}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Product</TableHead>
            <TableHead>QC Score</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Submitted</TableHead>
            {activeTab === 'rejected' && <TableHead>Rejection Reason</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <QueueTableRow
              key={product.id}
              product={product}
              activeTab={activeTab}
              isReviewPending={isReviewPending}
              onPreview={onPreview}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
