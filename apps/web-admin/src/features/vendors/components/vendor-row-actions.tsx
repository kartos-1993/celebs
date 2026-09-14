import { RowActionsMenu } from '@/components/row-actions-menu';

interface VendorRowActionsProps {
  shopName: string;
  status: string;
  onInspect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isActionPending: boolean;
}

/** Kebab row actions shared by vendor table (desktop). */
export function VendorRowActions({
  shopName,
  status,
  onInspect,
  onApprove,
  onReject,
  isActionPending,
}: VendorRowActionsProps) {
  return (
    <RowActionsMenu
      label={`Actions for ${shopName}`}
      items={[
        { label: 'Inspect documents', onSelect: onInspect },
        ...(status !== 'APPROVED'
          ? [
              {
                label: 'Approve vendor',
                onSelect: onApprove,
                disabled: isActionPending,
              },
            ]
          : []),
        ...(status !== 'REJECTED' && status !== 'APPROVED'
          ? [
              {
                label: 'Reject vendor',
                onSelect: onReject,
                disabled: isActionPending,
                destructive: true,
              },
            ]
          : []),
      ]}
    />
  );
}
