import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Info, Loader, Search, ShoppingBag, X } from 'lucide-react';
import { can, Permission } from '@celebs/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { Button } from '@celebs/shared-ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import { Input } from '@celebs/shared-ui/components/input';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Alert, AlertDescription } from '@celebs/shared-ui/components/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { useAuthContext } from '@/context/auth-provider';
import type { ProductFilterRequest } from '../api';
import type { ProductListItem, ProductStatus } from '../types';
import { useProductMutations, useProductsQuery } from '../hooks/use-product-queries';

const PAGE_SIZE = 10;

const productStatusTabs: Array<{ id: ProductStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Active (Published)' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deactivated', label: 'Deactivated' },
];

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
  const userPermissions = (user as { permissions?: string[] })?.permissions;
  const isSellerOrStaff =
    user?.role === 'VENDOR' || (user?.role === 'STAFF' && Boolean(user?.vendorId));
  const canCreate = can(user?.role || 'STAFF', Permission.PRODUCT_CREATE, userPermissions);
  const canEdit = can(user?.role || 'STAFF', Permission.PRODUCT_EDIT, userPermissions);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProductStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showHelpNotification, setShowHelpNotification] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null);

  const filters = useMemo<ProductFilterRequest>(
    () => ({
      search: appliedSearch || undefined,
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
    [appliedSearch, filterStatus, user, page],
  );

  const { data, isLoading, isFetching } = useProductsQuery(filters);
  const products = (data?.data?.products ?? []) as unknown as ProductListItem[];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { toggleActivation, archive, submitForReview } = useProductMutations();

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts((previous) =>
      checked ? [...previous, productId] : previous.filter((id) => id !== productId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? products.map((product) => product.id) : []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fashion-700">Manage Products</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory and track performance</p>
        </div>
        <Button asChild className="bg-orange-500 hover:bg-orange-600">
          <Link to="/products/new">+ New Product</Link>
        </Button>
      </div>

      {/* Help Notification */}
      {showHelpNotification && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 flex items-center justify-between">
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
          {/* Status Tabs */}
          <div className="flex gap-6 mb-6 border-b">
            {productStatusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterStatus(tab.id);
                  setPage(1);
                }}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  filterStatus === tab.id
                    ? 'border-orange-500 text-orange-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-4 mb-6 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          {/* Table */}
          <div
            className={
              isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'
            }
          >
            {isLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No products found.</div>
            ) : (
              <div className="rounded-md border">
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
                      <TableHead className="w-[100px]">Actions</TableHead>
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
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.brand && (
                              <div className="text-xs text-gray-500">Brand: {product.brand}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rs. {product.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(product.status)}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.vendorName || 'Independent Seller'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                                <Button variant="ghost" size="sm">
                                  More ▼
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
            <div className="flex justify-between items-center mt-4">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline">
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                variant="outline"
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
              <AlertTriangle className="h-5 w-5 text-amber-500" />
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
              {archive.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Archive Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageProduct;
