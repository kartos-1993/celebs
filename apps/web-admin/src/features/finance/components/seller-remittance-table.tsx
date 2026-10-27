import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { formatMoneyAmount } from '@celebs/shared-utils';

import type { PlatformSellerItem } from '../api';

interface SellerRemittanceTableProps {
  sellers: PlatformSellerItem[];
}

export function SellerRemittanceTable({ sellers }: SellerRemittanceTableProps) {
  if (sellers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active sellers found. Approved merchants will appear here.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shop Name</TableHead>
          <TableHead>Payout Method</TableHead>
          <TableHead className="text-right">Gross Sales</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead className="text-right">Refunds</TableHead>
          <TableHead className="text-right">Net Payable</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sellers.map((seller) => (
          <TableRow key={seller.vendorId}>
            <TableCell className="font-medium text-foreground">{seller.shopName}</TableCell>
            <TableCell>
              {seller.payoutMethod === 'BANK_ACCOUNT' ? (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 text-blue-600 dark:text-blue-400"
                >
                  Bank Transfer
                </Badge>
              ) : seller.payoutMethod === 'ESEWA' ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  eSewa
                </Badge>
              ) : seller.payoutMethod === 'KHALTI' ? (
                <Badge
                  variant="outline"
                  className="border-purple-500/30 text-purple-600 dark:text-purple-400"
                >
                  Khalti
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  Unconfigured
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums">
              {formatMoneyAmount(seller.grossSales)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              -{formatMoneyAmount(seller.commission)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400">
              {seller.refunds !== '0.00' ? `-${formatMoneyAmount(seller.refunds)}` : '0.00'}
            </TableCell>
            <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoneyAmount(seller.netPayable)}
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-[10px] text-emerald-600"
              >
                {seller.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
