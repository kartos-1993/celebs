import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { CommissionHistoryTable } from '../components/commission-history-table';
import { CommissionRateForm } from '../components/commission-rate-form';
import { useCommissionOverview, useSetCommissionRate } from '../hooks';

import { useToast } from '@/hooks/use-toast';

/**
 * The platform's cut.
 *
 * Superadmin only, and that guard is on the route: an admin who can read platform
 * finance and reconcile settlements must not be able to set the rate to zero,
 * which is the one edit here that cannot be walked back once a seller has listed
 * against it.
 *
 * History sits next to the form on purpose. Changing a rate is safe precisely
 * because it is additive, and a screen that only showed the current figure would
 * hide that.
 */
const CommissionsPage = () => {
  const { toast } = useToast();
  const overview = useCommissionOverview();
  const publish = useSetCommissionRate();

  if (overview.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const current = overview.data?.current ?? [];
  const history = overview.data?.history ?? [];
  const globalRate = current.find((rule) => rule.scope === 'GLOBAL')?.ratePercent ?? '0.00';
  const maxPercent = overview.data?.maxPercent ?? '100.00';

  const errorMessage = publish.error instanceof Error ? publish.error.message : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission"
        description="What the platform takes from a sale, and what each seller keeps."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CommissionRateForm
          currentRatePercent={globalRate}
          maxPercent={maxPercent}
          submitting={publish.isPending}
          error={errorMessage}
          onPublish={(input) =>
            publish.mutate(input, {
              onSuccess: () => toast({ title: 'New rate published' }),
            })
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Rate history</CardTitle>
            <CardDescription>
              Every rate that has applied, oldest first. A seller disputing an old charge can be
              shown the rate on the day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionHistoryTable rules={history} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionsPage;
