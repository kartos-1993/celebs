import { Link } from 'react-router-dom';
import { DollarSign, Percent, Plane, Sparkles } from 'lucide-react';

import type { ComboBundleType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

/** Mobile combos list — cards below md, paired with ComboTable. */
export function ComboCards({
  combos,
  isLoading,
}: {
  combos: ComboBundleType[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground md:hidden">
        Loading combo bundles...
      </div>
    );
  }

  if (combos.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState title="No combos found" description="No combo bundles match your query." />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {combos.map((combo) => (
        <Card key={combo.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            {combo.bannerImage ? (
              <img
                src={combo.bannerImage}
                alt={combo.title}
                className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{combo.title}</div>
              <div className="truncate text-xs text-muted-foreground">{combo.subtitle}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                /{combo.slug} ({combo.itemCount} items)
              </div>
            </div>
            <Badge variant={combo.isActive ? 'success' : 'secondary'} className="shrink-0">
              {combo.isActive ? 'ACTIVE' : 'DRAFT'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              {combo.tag === 'abroad-travel' && (
                <Plane aria-hidden="true" className="mr-1 h-3 w-3 text-info" />
              )}
              {combo.tag === 'festive' && (
                <Sparkles aria-hidden="true" className="mr-1 h-3 w-3 text-warning" />
              )}
              {combo.tag || 'general'}
            </Badge>
            <span className="flex items-center gap-1 text-xs font-semibold text-success">
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
            </span>
          </div>

          <Button asChild variant="outline" className="h-10 w-full">
            <Link to={`/marketing/combos/${combo.id}`}>Edit</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
