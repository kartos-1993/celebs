import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminVendorsQueryFn, approveVendorMutationFn, rejectVendorMutationFn, suspendVendorMutationFn } from '@/lib/api';
import { Button } from '@celebs/shared-ui/components/button';

export default function VendorList() {
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: getAdminVendorsQueryFn,
  });

  const approveMutation = useMutation({
    mutationFn: approveVendorMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectVendorMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: suspendVendorMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading vendors...</div>;
  }

  const vendors = response?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Vendor Management</h1>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-sm font-medium">
              <th className="p-4">Shop Name</th>
              <th className="p-4">Owner Name</th>
              <th className="p-4">Phone Number</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No vendors registered yet.
                </td>
              </tr>
            ) : (
              vendors.map((vendor: any) => (
                <tr key={vendor.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{vendor.shopName}</td>
                  <td className="p-4">{vendor.user?.name}</td>
                  <td className="p-4">{vendor.phoneNumber}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vendor.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : vendor.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : vendor.status === 'DOCUMENTS_SUBMITTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {vendor.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveMutation.mutate(vendor.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    )}
                    {vendor.status !== 'REJECTED' && vendor.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason !== null) {
                            rejectMutation.mutate({ id: vendor.id, reason });
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    )}
                    {vendor.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => suspendMutation.mutate(vendor.id)}
                        disabled={suspendMutation.isPending}
                      >
                        Suspend
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
