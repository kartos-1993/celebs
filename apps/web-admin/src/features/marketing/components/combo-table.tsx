import { Link } from 'react-router-dom';
import { DollarSign, Percent, Plane, Sparkles } from 'lucide-react';

import type { ComboBundleType } from '@celebs/shared-types';
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

interface ComboTableProps {
  combos: ComboBundleType[];
  isLoading: boolean;
}

/** Desktop combos table — hidden below md, paired with ComboCards. */
export function ComboTable({ combos, isLoading }: ComboTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Combo Details</TableHead>
            <TableHead>Category / Tag</TableHead>
            <TableHead>Discount Offer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Loading combo bundles...
                </div>
              </TableCell>
            </TableRow>
          ) : combos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  title="No combos found"
                  description="No combo bundles match your query."
                />
              </TableCell>
            </TableRow>
          ) : (
            combos.map((combo) => (
              <TableRow key={combo.id} className="transition-colors hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {combo.bannerImage ? (
                      <img
                        src={combo.bannerImage}
                        alt={combo.title}
                        className="h-12 w-12 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Sparkles aria-hidden="true" className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">{combo.title}</div>
                      <div className="text-xs text-muted-foreground">{combo.subtitle}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        /{combo.slug} ({combo.itemCount} items)
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {combo.tag === 'abroad-travel' && (
                      <Plane aria-hidden="true" className="mr-1 h-3 w-3 text-info" />
                    )}
                    {combo.tag === 'festive' && (
                      <Sparkles aria-hidden="true" className="mr-1 h-3 w-3 text-warning" />
                    )}
                    {combo.tag || 'general'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs font-semibold text-success">
                    {combo.discountType === 'PERCENTAGE' ? (
                      <>
                        <Percent aria-hidden="true" className="h-3.5 w-3.5" />
                        {combo.discountValue}% OFF Total
                      </>
                    ) : (
                      <>
                        <DollarSign aria-hidden="true" className="h-3.5 w-3.5" />
                        Save NPR {combo.discountValue.toLocaleString()}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={combo.isActive ? 'success' : 'secondary'}>
                    {combo.isActive ? 'ACTIVE' : 'DRAFT'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/marketing/combos/${combo.id}`}>Edit</Link>
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
