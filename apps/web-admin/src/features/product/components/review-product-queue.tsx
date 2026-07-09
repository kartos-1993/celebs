import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@celebs/shared-ui/components/table';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import { Textarea } from '@celebs/shared-ui/components/textarea';
import { Search, Eye, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductApiService } from '../api';

export default function ReviewProductQueue() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { toast } = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'pending') {
        res = await ProductApiService.getProductReviewQueue(currentPage, 10);
      } else {
        res = await ProductApiService.getProducts({
          status: activeTab === 'published' ? 'published' : 'rejected',
          search: search || undefined,
          page: currentPage,
          limit: 10,
        });
      }

      if (res && res.data) {
        setProducts(res.data.products || res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading queue',
        description: error.response?.data?.message || error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeTab, currentPage, search]);

  const handleApprove = async (id: string) => {
    try {
      await ProductApiService.reviewProduct(id, 'approve');
      toast({
        title: 'Success',
        description: 'Product approved and published successfully',
      });
      fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Approval failed',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please specify a reason for rejecting the product.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await ProductApiService.reviewProduct(selectedProduct._id, 'reject', rejectReason);
      toast({
        title: 'Product Rejected',
        description: 'Product has been rejected and the vendor notified.',
      });
      setIsRejectOpen(false);
      setRejectReason('');
      setSelectedProduct(null);
      fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Rejection failed',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    }
  };

  const openRejectModal = (product: any) => {
    setSelectedProduct(product);
    setRejectReason('');
    setIsRejectOpen(true);
  };

  const openPreviewModal = (product: any) => {
    setSelectedProduct(product);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Product Queue</h1>
          <p className="text-muted-foreground">Manage vendor product approvals and quality assurance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['pending', 'published', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            } capitalize`}
          >
            {tab === 'pending' ? 'Pending Review' : tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {activeTab !== 'pending' && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground ml-auto">
              Total items found: {products.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{activeTab === 'pending' ? 'Pending Products' : `${activeTab} Products`}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-muted-foreground">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <span className="text-muted-foreground">No products in this queue</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Date</TableHead>
                    {activeTab === 'rejected' && <TableHead>Rejection Note</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.mainImages?.[0] || '/placeholder.svg'}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div>
                            <span className="font-semibold block max-w-xs truncate">{product.name}</span>
                            <span className="text-xs text-muted-foreground">Brand: {product.brand || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.vendorName || 'Independent'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.category?.name || 'Category'}
                        </Badge>
                      </TableCell>
                      <TableCell>Rs. {product.price}</TableCell>
                      <TableCell>
                        {new Date(product.updatedAt || product.createdAt).toLocaleDateString()}
                      </TableCell>
                      {activeTab === 'rejected' && (
                        <TableCell className="max-w-xs truncate text-destructive">
                          {product.reviewNote || 'No reason specified'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPreviewModal(product)}
                            title="Preview Details"
                          >
                            <Eye className="h-4 w-4 mr-1" /> Preview
                          </Button>

                          {activeTab === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(product._id)}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openRejectModal(product)}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
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
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>
              Provide feedback for the vendor detailing why this product is being rejected. This will be sent via email.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="E.g., Missing clear size chart, images are low quality, price is incorrect..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>
              Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh]">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>
                  Review the full product specifications and variant configurations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Images */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Product Images</h4>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {selectedProduct.mainImages?.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-24 w-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold block">Brand</span>
                    <span className="text-muted-foreground">{selectedProduct.brand || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block">Price</span>
                    <span className="text-muted-foreground">Rs. {selectedProduct.price}</span>
                  </div>
                  <div>
                    <span className="font-semibold block">Discounted Price</span>
                    <span className="text-muted-foreground">
                      {selectedProduct.discountedPrice ? `Rs. ${selectedProduct.discountedPrice}` : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block">Status</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedProduct.status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Variants & Sizes */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available Sizes</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((s: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProduct.colorVariants && selectedProduct.colorVariants.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Color Variants</h4>
                    <div className="space-y-2">
                      {selectedProduct.colorVariants.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 text-sm border p-2 rounded">
                          <div
                            className="h-6 w-6 rounded-full border"
                            style={{ backgroundColor: c.colorCode }}
                            title={c.name}
                          />
                          <div>
                            <span className="font-semibold block">{c.name}</span>
                            <span className="text-xs text-muted-foreground">Code: {c.colorCode}</span>
                          </div>
                          <div className="ml-auto flex gap-2">
                            {c.stocks?.map((st: any, sIdx: number) => (
                              <span key={sIdx} className="text-xs bg-muted px-2 py-1 rounded">
                                Size {st.size}: {st.quantity} left
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
