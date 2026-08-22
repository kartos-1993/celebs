import { useCallback, useMemo,useState } from 'react';
import { AlertTriangle, Check, Eye, Search, ShieldCheck, Store, X } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { Input } from '@celebs/shared-ui/components/input';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import type { ProductFilterRequest,ReviewProductRequestPayload } from '../../api';
import {
  useProductMutations,
  useProductsQuery,
  useReviewQueueQuery,
} from '../../hooks/use-product-queries';
import { formatProductCategoryBreadcrumb } from '../../utils/category-format';

import { PreviewModal } from './preview-modal';
import { QualityBadge } from './quality-badge';
import { RejectionDialog } from './rejection-dialog';
import type { ProductQueueItem } from './types';

import { useDebounce } from '@/hooks/use-debounce';

const PAGE_SIZE = 10;

export default function ReviewProductQueue() {
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState<ProductQueueItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const isPendingTab = activeTab === 'pending';

  const listFilters = useMemo<ProductFilterRequest>(
    () => ({
      status: activeTab === 'published' ? 'published' : 'rejected',
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [activeTab, debouncedSearch, currentPage],
  );

  const queueQuery = useReviewQueueQuery(currentPage, PAGE_SIZE, isPendingTab);
  const listQuery = useProductsQuery(listFilters, !isPendingTab);

  const activeQuery = isPendingTab ? queueQuery : listQuery;
  const products = (activeQuery.data?.data?.products ?? []) as ProductQueueItem[];
  const total = activeQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { review } = useProductMutations();

  const handleApprove = (id: string) => {
    review.mutate(
      { id, payload: { action: 'approve' } },
      { onSuccess: () => setIsPreviewOpen(false) },
    );
  };

  const handleRejectSubmit = useCallback(
    (payload: ReviewProductRequestPayload) => {
      if (!selectedProduct) return;
      review.mutate(
        { id: selectedProduct.id, payload },
        {
          onSuccess: () => {
            setIsRejectOpen(false);
            setIsPreviewOpen(false);
            setSelectedProduct(null);
          },
        },
      );
    },
    [selectedProduct, review],
  );

  const openPreview = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setIsPreviewOpen(true);
  };

  const openReject = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setIsRejectOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Superadmin Review Queue"
        description="Daraz & SHEIN quality control station with live customer PDP simulation and structured feedback."
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => {
          setActiveTab(v as 'pending' | 'published' | 'rejected');
          setCurrentPage(1);
          setSearchInput('');
        }}
      >
        <TabsList>
          {(['pending', 'published', 'rejected'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab === 'pending' ? 'Pending Review' : tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {!isPendingTab && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, brand or vendor..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              Total listings found: <span className="font-semibold text-foreground">{total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            {isPendingTab ? 'Pending QC Approvals' : `${activeTab} Listings`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-muted-foreground">Evaluating product review queue...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <span className="text-muted-foreground">No product listings in this queue</span>
            </div>
          ) : (
            <div
              className={`overflow-x-auto ${activeQuery.isFetching ? 'opacity-60' : ''} transition-opacity`}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>QC Score</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Submitted</TableHead>
                    {activeTab === 'rejected' && <TableHead>Rejection Reason</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
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
                          <div>
                            <span className="font-semibold block max-w-xs truncate text-foreground">
                              {product.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Brand:{' '}
                              <strong className="text-foreground">{product.brand || 'N/A'}</strong>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <QualityBadge score={product.qualityScore} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Store className="w-3.5 h-3.5 text-muted-foreground" />
                          {product.vendorName || 'Independent Seller'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs max-w-[220px] truncate block" title={formatProductCategoryBreadcrumb(product)}>
                          {formatProductCategoryBreadcrumb(product)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>Rs. {product.price.toLocaleString()}</div>
                        {product.discountedPrice && (
                          <div className="text-xs text-success font-normal">
                            Disc: Rs. {product.discountedPrice.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString()
                          : 'Recent'}
                      </TableCell>
                      {activeTab === 'rejected' && (
                        <TableCell className="max-w-xs truncate">
                          <div className="text-xs text-destructive font-medium">
                            {product.rejectionReasonCategory || 'General QC Issue'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {product.reviewNote || 'No detailed note provided'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPreview(product)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" /> Comprehensive Preview
                          </Button>
                          {isPendingTab && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                                onClick={() => handleApprove(product.id)}
                                disabled={review.isPending}
                              >
                                <Check className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={() => openReject(product)}
                                disabled={review.isPending}
                              >
                                <X className="h-4 w-4" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured rejection dialog (keyed to reset state per product) */}
      {selectedProduct && (
        <RejectionDialog
          key={`reject-${selectedProduct.id}`}
          open={isRejectOpen}
          onOpenChange={setIsRejectOpen}
          isSubmitting={review.isPending}
          onSubmit={handleRejectSubmit}
        />
      )}

      {/* Comprehensive PDP & QC inspection modal */}
      {selectedProduct && (
        <PreviewModal
          key={`preview-${selectedProduct.id}`}
          product={selectedProduct}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          isSubmitting={review.isPending}
          onApprove={handleApprove}
          onReject={openReject}
        />
      )}
    </div>
  );
}
