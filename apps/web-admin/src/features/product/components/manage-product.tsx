import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Send,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

import { can, Permission } from '@celebs/rbac';
import { Alert, AlertDescription } from '@celebs/shared-ui/components/alert';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import {
  archiveProduct,
  type ProductFilterRequest,
  submitProductForReview,
  toggleProductActivation,
} from '../api';
import {
  PRODUCT_QUERY_KEYS,
  useProductMutations,
  useProductsQuery,
} from '../hooks/use-product-queries';
import type { ProductListItem, ProductStatus } from '../types';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';
import { useAuthContext } from '@/context/auth-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

const productStatusTabs: Array<{ id: ProductStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Active (Published)' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deactivated', label: 'Deactivated' },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  deactivated: 'Deactivated',
};

const statusBadgeVariant = (
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'published') return 'default';
  if (status === 'pending_review') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
};

const ManageProduct = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userPermissions = (user as { permissions?: string[] })?.permissions;
  const isSellerOrStaff =
    user?.role === 'VENDOR' || (user?.role === 'STAFF' && Boolean(user?.vendorId));
  const canCreate = can(user?.role || 'STAFF', Permission.PRODUCT_CREATE, userPermissions);
  const canEdit = can(user?.role || 'STAFF', Permission.PRODUCT_EDIT, userPermissions);
  const canDelete = can(user?.role || 'STAFF', Permission.PRODUCT_DELETE, userPermissions);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filterStatus, setFilterStatus] = useState<ProductStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showHelpNotification, setShowHelpNotification] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const filters = useMemo<ProductFilterRequest>(
    () => ({
      search: debouncedSearch || undefined,
      status: filterStatus === 'all' ? undefined : filterStatus,
      vendorId:
        user?.role === 'VENDOR'
          ? user?.vendorProfile?.id
          : user?.role === 'STAFF'
            ? user?.vendorId
            : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, filterStatus, user, page],
  );

  const { data, isLoading, isFetching } = useProductsQuery(filters);
  const products = useMemo(
    () => (data?.data?.products ?? []) as ProductListItem[],
    [data?.data?.products],
  );
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { toggleActivation, archive, submitForReview } = useProductMutations();

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts((previous) =>
      checked ? [...previous, productId] : previous.filter((id) => id !== productId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? products.map((product) => product.id) : []);
  };

  // Selected items analysis for batch actions
  const selectedItems = useMemo(
    () => products.filter((p) => selectedProducts.includes(p.id)),
    [products, selectedProducts],
  );

  const submittableCount = useMemo(
    () => selectedItems.filter((p) => p.status === 'draft' || p.status === 'rejected').length,
    [selectedItems],
  );

  const activatableCount = useMemo(
    () => selectedItems.filter((p) => p.status === 'deactivated').length,
    [selectedItems],
  );

  const deactivatableCount = useMemo(
    () => selectedItems.filter((p) => p.status === 'published').length,
    [selectedItems],
  );

  const handleBatchSubmit = async () => {
    const targets = selectedItems.filter((p) => p.status === 'draft' || p.status === 'rejected');
    if (targets.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((product) => submitProductForReview(product.id)),
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      setSelectedProducts([]);
      toast({
        title: 'Batch submission complete',
        description: `Successfully submitted ${successful} of ${targets.length} product(s) for review.`,
      });
    } catch (_err) {
      toast({
        title: 'Batch submission failed',
        description: 'Failed to submit some products for review.',
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchToggleStatus = async (type: 'activate' | 'deactivate') => {
    const targetStatus = type === 'activate' ? 'deactivated' : 'published';
    const targets = selectedItems.filter((p) => p.status === targetStatus);
    if (targets.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((product) => toggleProductActivation(product.id)),
      );
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      setSelectedProducts([]);
      toast({
        title: `Batch ${type} complete`,
        description: `Successfully ${type}d ${successful} of ${targets.length} product(s).`,
      });
    } catch (_err) {
      toast({
        title: `Batch ${type} failed`,
        description: `Failed to ${type} some products.`,
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchArchiveConfirm = async () => {
    if (selectedProducts.length === 0) return;

    setIsBatchProcessing(true);
    try {
      const results = await Promise.allSettled(selectedProducts.map((id) => archiveProduct(id)));
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      await queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      setSelectedProducts([]);
      setIsBatchArchiveOpen(false);
      toast({
        title: 'Batch archive complete',
        description: `Successfully archived ${successful} product(s).`,
      });
    } catch (_err) {
      toast({
        title: 'Batch archive failed',
        description: 'Failed to archive some products.',
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manage Products"
        description="Manage your product inventory and track performance"
        actions={
          <Button asChild>
            <Link to="/products/new">+ New Product</Link>
          </Button>
        }
      />

      {/* Help Notification */}
      {showHelpNotification && (
        <Alert className="border-info/30 bg-info/10">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-info flex items-center justify-between">
            <div>
              <span className="font-medium">Welcome to Product Management.</span> Sellers can view
              status and submit drafts for review. Admins can approve items.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpNotification(false)}
              className="ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Product List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search & Status Filter */}
          <FilterBar className="mb-4">
            <FilterSearch
              value={searchInput}
              onChange={(value) => {
                setSearchInput(value);
                setPage(1);
              }}
              placeholder="Search products..."
            />
            <SegmentedTabs
              options={productStatusTabs.map((tab) => ({ value: tab.id, label: tab.label }))}
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                setPage(1);
              }}
            />
          </FilterBar>

          {/* Batch Actions (contextual) */}
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 p-2 text-xs text-foreground shadow-sm mb-4">
              <span className="font-semibold px-1">{selectedProducts.length} selected</span>

              {isSellerOrStaff && canCreate && submittableCount > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 gap-1 px-2.5 text-xs"
                  disabled={isBatchProcessing}
                  onClick={handleBatchSubmit}
                >
                  {isBatchProcessing ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
                  Submit ({submittableCount})
                </Button>
              )}

              {isSellerOrStaff && canEdit && activatableCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-success/30 bg-success/10 px-2.5 text-xs text-success hover:bg-success/20"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchToggleStatus('activate')}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Activate ({activatableCount})
                </Button>
              )}

              {isSellerOrStaff && canEdit && deactivatableCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-warning/30 bg-warning/10 px-2.5 text-xs text-warning hover:bg-warning/20"
                  disabled={isBatchProcessing}
                  onClick={() => handleBatchToggleStatus('deactivate')}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Deactivate ({deactivatableCount})
                </Button>
              )}

              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-destructive/30 bg-destructive/10 px-2.5 text-xs text-destructive hover:bg-destructive/20"
                  disabled={isBatchProcessing}
                  onClick={() => setIsBatchArchiveOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Archive ({selectedProducts.length})
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedProducts([])}
                disabled={isBatchProcessing}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          <div
            className={
              isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'
            }
          >
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8" />}
                title="No products found"
                description={
                  debouncedSearch
                    ? `Nothing matches "${debouncedSearch}". Try a different search or status filter.`
                    : 'Try a different status filter, or create your first product.'
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedProducts.length === products.length && products.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Product Info</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ownership</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) =>
                              handleSelectProduct(product.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.mainImages?.[0] || '/placeholder.svg'}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover border bg-muted"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = '/placeholder.svg';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="font-medium max-w-xs truncate">{product.name}</div>
                              {product.brand && (
                                <div className="text-xs text-muted-foreground truncate">
                                  Brand: {product.brand}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rs. {product.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(product.status)}>
                            {statusLabels[product.status] ?? product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.vendorName || 'Independent Seller'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {isSellerOrStaff &&
                              canCreate &&
                              (product.status === 'draft' || product.status === 'rejected') && (
                                <Button
                                  size="sm"
                                  disabled={submitForReview.isPending}
                                  onClick={() => submitForReview.mutate(product.id)}
                                >
                                  Submit
                                </Button>
                              )}
                            {isSellerOrStaff &&
                              canEdit &&
                              (product.status === 'published' ||
                                product.status === 'deactivated') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={toggleActivation.isPending}
                                  onClick={() => toggleActivation.mutate(product.id)}
                                >
                                  {product.status === 'published' ? 'Deactivate' : 'Activate'}
                                </Button>
                              )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open actions menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/products/edit/${product.id}`}>Edit</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setArchiveTarget(product)}>
                                  Archive (Delete)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive confirmation — was previously an instant, unconfirmed soft-delete */}
      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Archive “{archiveTarget?.name}”?
            </DialogTitle>
            <DialogDescription>
              This product will be soft-deleted: it is hidden from the storefront and removed from
              active listings. This action is tracked in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={archive.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={archive.isPending || !archiveTarget}
              onClick={() => {
                if (!archiveTarget) return;
                archive.mutate(archiveTarget.id, {
                  onSuccess: () => setArchiveTarget(null),
                });
              }}
            >
              {archive.isPending && <Spinner size="sm" className="mr-2" />}
              Archive Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch archive confirmation */}
      <Dialog
        open={isBatchArchiveOpen}
        onOpenChange={(open) => !open && setIsBatchArchiveOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive {selectedProducts.length} Selected Product(s)?
            </DialogTitle>
            <DialogDescription>
              These products will be soft-deleted: they will be hidden from the storefront and
              removed from active listings. This action is tracked in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBatchArchiveOpen(false)}
              disabled={isBatchProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBatchProcessing || selectedProducts.length === 0}
              onClick={handleBatchArchiveConfirm}
            >
              {isBatchProcessing && <Spinner size="sm" className="mr-2" />}
              Archive Selected Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageProduct;
