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
import {
  Search,
  Eye,
  Check,
  X,
  AlertTriangle,
  Smartphone,
  Monitor,
  ShieldCheck,
  Tag,
  Ruler,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Store,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductApiService, ReviewProductRequestPayload } from '../api';

export interface CategoryRef {
  _id?: string;
  name: string;
  slug?: string;
  path?: string;
}

export interface ProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface BodyMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface SizeItem {
  name: string;
  productMeasurements?: ProductMeasurement[];
  bodyMeasurements?: BodyMeasurement[];
}

export interface StockItem {
  size: string;
  quantity: number;
}

export interface ColorVariantItem {
  name: string;
  colorCode: string;
  images?: string[];
  stocks?: StockItem[];
}

export interface ReviewHistoryRecord {
  action: 'approve' | 'reject' | 'submit';
  reviewerId?: string;
  reviewerName?: string;
  rejectionReasonCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
  note?: string;
  reviewedAt: string | Date;
}

export interface ProductQueueItem {
  _id: string;
  name: string;
  brand?: string;
  slug?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  category?: CategoryRef | string;
  subcategory?: CategoryRef | string;
  sizes?: SizeItem[];
  colorVariants?: ColorVariantItem[];
  mainImages?: string[];
  dynamicData?: Record<string, unknown>;
  tags?: string[];
  featured?: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deactivated' | 'archived';
  vendorId?: string;
  vendorName?: string;
  reviewNote?: string;
  rejectionReasonCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
  qualityScore?: number;
  reviewHistory?: ReviewHistoryRecord[];
  reviewedBy?: string;
  reviewedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface RejectionCategoryOption {
  id: string;
  label: string;
  subcategories: string[];
  suggestedFields: string[];
}

const REJECTION_CATEGORIES: RejectionCategoryOption[] = [
  {
    id: 'Image Guidelines & Quality',
    label: 'Image Guidelines & Quality',
    subcategories: [
      'Images low resolution or pixelated (under 800x800)',
      'Watermark, promo text, or competitor logo present',
      'Inappropriate background or poor lighting',
      'Missing key product angles (front, back, label)',
    ],
    suggestedFields: ['mainImages', 'colorVariants'],
  },
  {
    id: 'Product Information & Specifications',
    label: 'Product Information & Specifications',
    subcategories: [
      'Title too short or spammy with promotional words',
      'Incomplete or misleading description text',
      'Incorrect category or subcategory selection',
      'Missing required category specifications (material, fit, care)',
    ],
    suggestedFields: ['name', 'description', 'category', 'dynamicData'],
  },
  {
    id: 'Sizing, Fit & Measurement Chart',
    label: 'Sizing, Fit & Measurement Chart',
    subcategories: [
      'Missing size chart or measurement values',
      'Mismatched size names between variants and guide',
      'Unrealistic measurement units',
    ],
    suggestedFields: ['sizes'],
  },
  {
    id: 'Pricing, Discount & Stock Violations',
    label: 'Pricing, Discount & Stock Violations',
    subcategories: [
      'Inflated original price or false discount percentage',
      'Discounted price higher than regular price',
      'Zero stock listed for all variants',
    ],
    suggestedFields: ['price', 'discountedPrice', 'stocks'],
  },
  {
    id: 'Intellectual Property & Policy Compliance',
    label: 'Intellectual Property & Policy Compliance',
    subcategories: [
      'Suspected counterfeit, replica, or unauthorized trademark claim',
      'Prohibited or restricted item under platform terms',
      'Misleading warranty or origin statements',
    ],
    suggestedFields: ['brand', 'description', 'mainImages'],
  },
];

const FLAGGED_FIELDS_OPTIONS = [
  { id: 'mainImages', label: 'Main Images' },
  { id: 'colorVariants', label: 'Color Variant Photos' },
  { id: 'name', label: 'Product Title' },
  { id: 'brand', label: 'Brand Name' },
  { id: 'description', label: 'Description' },
  { id: 'category', label: 'Category Selection' },
  { id: 'dynamicData', label: 'Category Specifications' },
  { id: 'sizes', label: 'Size Guide & Measurements' },
  { id: 'price', label: 'Pricing & Discount' },
  { id: 'stocks', label: 'Inventory Stock' },
];

export default function ReviewProductQueue() {
  const [products, setProducts] = useState<ProductQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Active State
  const [selectedProduct, setSelectedProduct] = useState<ProductQueueItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activePreviewImage, setActivePreviewImage] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'overview' | 'specs' | 'sizes' | 'variants' | 'qc' | 'history'>('overview');

  // Rejection State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [flaggedFields, setFlaggedFields] = useState<string[]>([]);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);

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
        const rawList = (res.data.products || res.data) as unknown as ProductQueueItem[];
        setProducts(Array.isArray(rawList) ? rawList : []);
        setTotalPages(res.data.total ? Math.ceil(res.data.total / 10) : 1);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: 'Error loading queue',
        description: err.response?.data?.message || err.message || 'Something went wrong',
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
    setSubmittingAction(true);
    try {
      await ProductApiService.reviewProduct(id, 'approve');
      toast({
        title: 'Product Approved',
        description: 'Product listing approved and published to customer marketplace.',
      });
      setIsPreviewOpen(false);
      fetchQueue();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: 'Approval failed',
        description: err.response?.data?.message || err.message || 'Error publishing product',
        variant: 'destructive',
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const openRejectModal = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setSelectedCategory(REJECTION_CATEGORIES[0].id);
    setSelectedSubcategories([]);
    setFlaggedFields(REJECTION_CATEGORIES[0].suggestedFields);
    setRejectionNote('');
    setIsRejectOpen(true);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    const cat = REJECTION_CATEGORIES.find((c) => c.id === catId);
    if (cat) {
      setSelectedSubcategories([]);
      setFlaggedFields(cat.suggestedFields);
    }
  };

  const toggleSubcategory = (sub: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((item) => item !== sub) : [...prev, sub]
    );
  };

  const toggleFlaggedField = (fieldId: string) => {
    setFlaggedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
    );
  };

  const handleRejectSubmit = async () => {
    if (!selectedProduct) return;
    if (!selectedCategory) {
      toast({
        title: 'Category required',
        description: 'Please select a primary rejection reason category.',
        variant: 'destructive',
      });
      return;
    }

    if (!rejectionNote.trim() && selectedSubcategories.length === 0) {
      toast({
        title: 'Feedback required',
        description: 'Please select at least one issue subcategory or type detailed feedback for the vendor.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingAction(true);
    try {
      const payload: ReviewProductRequestPayload = {
        action: 'reject',
        rejectionCategory: selectedCategory,
        rejectionSubcategories: selectedSubcategories,
        rejectionFields: flaggedFields,
        note: rejectionNote.trim(),
      };

      await ProductApiService.reviewProduct(selectedProduct._id, payload);
      toast({
        title: 'Product Rejected',
        description: 'Structured rejection note submitted and email sent to vendor.',
      });
      setIsRejectOpen(false);
      setIsPreviewOpen(false);
      setSelectedProduct(null);
      fetchQueue();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: 'Rejection failed',
        description: err.response?.data?.message || err.message || 'Error submitting rejection',
        variant: 'destructive',
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const openPreviewModal = (product: ProductQueueItem) => {
    setSelectedProduct(product);
    setActivePreviewImage(product.mainImages?.[0] || '');
    setPreviewTab('overview');
    setIsPreviewOpen(true);
  };

  const getCategoryName = (cat?: CategoryRef | string): string => {
    if (!cat) return 'Uncategorized';
    if (typeof cat === 'string') return cat;
    return cat.name;
  };

  const getQualityBadge = (score?: number) => {
    const val = score ?? 0;
    if (val >= 85) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
          <Sparkles className="w-3 h-3" /> QC {val}% High
        </Badge>
      );
    }
    if (val >= 70) {
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 font-semibold">
          <CheckCircle2 className="w-3 h-3" /> QC {val}% Good
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
        <AlertCircle className="w-3 h-3" /> QC {val}% Action Needed
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Superadmin Review Queue</h1>
          <p className="text-muted-foreground">
            Daraz & SHEIN quality control station with live customer PDP simulation and structured feedback.
          </p>
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
                ? 'border-primary text-primary font-semibold'
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
                  placeholder="Search by title, brand or vendor..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Total listings found: <span className="font-semibold text-foreground">{products.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            {activeTab === 'pending' ? 'Pending QC Approvals' : `${activeTab} Listings`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-muted-foreground">Evaluating product review queue...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <span className="text-muted-foreground">No product listings in this queue</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    <TableRow key={product._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.mainImages?.[0] || '/placeholder.svg'}
                            alt={product.name}
                            className="h-12 w-12 rounded object-cover border bg-muted"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div>
                            <span className="font-semibold block max-w-xs truncate text-foreground">
                              {product.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Brand: <strong className="text-foreground">{product.brand || 'N/A'}</strong>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getQualityBadge(product.qualityScore)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Store className="w-3.5 h-3.5 text-muted-foreground" />
                          {product.vendorName || 'Independent Seller'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(product.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>Rs. {product.price.toLocaleString()}</div>
                        {product.discountedPrice && (
                          <div className="text-xs text-emerald-600 font-normal">
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
                            onClick={() => openPreviewModal(product)}
                            title="Open Comprehensive Preview"
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" /> Comprehensive Preview
                          </Button>

                          {activeTab === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => handleApprove(product._id)}
                                disabled={submittingAction}
                              >
                                <Check className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={() => openRejectModal(product)}
                                disabled={submittingAction}
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

      {/* Structured Rejection Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Reject Product Listing
            </DialogTitle>
            <DialogDescription>
              Select quality control issues and specify required seller actions. An automated structured notification will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3 text-sm">
            {/* Primary Category Selector */}
            <div>
              <label className="font-semibold block mb-1 text-foreground">
                Primary Rejection Category <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {REJECTION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Checkboxes */}
            <div>
              <label className="font-semibold block mb-2 text-foreground">
                Specific Issue Checklists (Select all that apply)
              </label>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
                {REJECTION_CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories.map(
                  (sub, idx) => (
                    <label key={idx} className="flex items-start gap-2 cursor-pointer text-xs leading-tight">
                      <input
                        type="checkbox"
                        checked={selectedSubcategories.includes(sub)}
                        onChange={() => toggleSubcategory(sub)}
                        className="mt-0.5 rounded border-input text-destructive focus:ring-destructive"
                      />
                      <span>{sub}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Flagged Item Fields */}
            <div>
              <label className="font-semibold block mb-2 text-foreground">
                Flagged Fields (Highlighted in Seller Dashboard)
              </label>
              <div className="flex flex-wrap gap-2">
                {FLAGGED_FIELDS_OPTIONS.map((field) => {
                  const isSelected = flaggedFields.includes(field.id);
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => toggleFlaggedField(field.id)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        isSelected
                          ? 'bg-destructive text-destructive-foreground border-destructive font-medium'
                          : 'bg-background hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {field.label} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Instructions Textarea */}
            <div>
              <label className="font-semibold block mb-1 text-foreground">
                Actionable Seller Remediation Notes
              </label>
              <Textarea
                placeholder="E.g., Please upload higher resolution photos without logo watermarks. Update the size chart table to include chest measurements in cm."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={submittingAction}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={submittingAction}
              className="gap-1"
            >
              <X className="w-4 h-4" /> Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive PDP & QC Inspection Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {selectedProduct && (
            <div className="flex flex-col h-full">
              {/* Modal Header */}
              <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                    {getQualityBadge(selectedProduct.qualityScore)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>
                      Vendor: <strong className="text-foreground">{selectedProduct.vendorName || 'Independent'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Category: <strong className="text-foreground">{getCategoryName(selectedProduct.category)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Brand: <strong className="text-foreground">{selectedProduct.brand || 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                {/* Device View Switcher Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1 border">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop View
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile Frame
                  </button>
                </div>
              </div>

              {/* Inspection Tab Navigation */}
              <div className="flex border-b bg-background px-4 overflow-x-auto text-xs font-medium">
                {[
                  { id: 'overview', label: 'Live PDP Preview', icon: Eye },
                  { id: 'specs', label: 'Category Specs & Attributes', icon: Tag },
                  { id: 'sizes', label: 'Size Chart & Measurements', icon: Ruler },
                  { id: 'variants', label: 'Color Variants & Stock', icon: Layers },
                  { id: 'qc', label: 'QC Scorecard', icon: ShieldCheck },
                  { id: 'history', label: 'Audit History', icon: History },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = previewTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPreviewTab(tab.id as typeof previewTab)}
                      className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-primary text-primary font-semibold'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="p-6">
                {/* 1. Live Customer PDP View */}
                {previewTab === 'overview' && (
                  <div className={previewDevice === 'mobile' ? 'max-w-sm mx-auto border-4 border-foreground/20 rounded-2xl p-4 shadow-2xl bg-background' : ''}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Image Gallery Switcher */}
                      <div className="space-y-3">
                        <div className="relative aspect-square rounded-xl overflow-hidden border bg-muted group">
                          <img
                            src={activePreviewImage || selectedProduct.mainImages?.[0] || '/placeholder.svg'}
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur">
                            {selectedProduct.mainImages?.length || 0} Main Images
                          </span>
                        </div>

                        {/* Thumbnails */}
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {selectedProduct.mainImages?.map((imgUrl, index) => (
                            <button
                              key={index}
                              onClick={() => setActivePreviewImage(imgUrl)}
                              className={`h-16 w-16 rounded-md overflow-hidden border-2 transition-all ${
                                (activePreviewImage || selectedProduct.mainImages?.[0]) === imgUrl
                                  ? 'border-primary scale-95'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Product Details PDP Column */}
                      <div className="space-y-4">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {selectedProduct.brand || 'No Brand'}
                          </Badge>
                          <h3 className="text-2xl font-bold text-foreground">{selectedProduct.name}</h3>
                          <div className="flex items-baseline gap-3 mt-2">
                            <span className="text-2xl font-extrabold text-foreground">
                              Rs. {selectedProduct.price.toLocaleString()}
                            </span>
                            {selectedProduct.discountedPrice && (
                              <>
                                <span className="text-base text-muted-foreground line-through">
                                  Rs. {selectedProduct.discountedPrice.toLocaleString()}
                                </span>
                                <Badge className="bg-destructive text-destructive-foreground">
                                  {Math.round(
                                    ((selectedProduct.price - selectedProduct.discountedPrice) /
                                      selectedProduct.price) *
                                      100
                                  )}
                                  % OFF
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Sizes */}
                        {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                              Available Sizes
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {selectedProduct.sizes.map((s, idx) => (
                                <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm font-medium">
                                  {s.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color Variants */}
                        {selectedProduct.colorVariants && selectedProduct.colorVariants.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                              Color Options ({selectedProduct.colorVariants.length})
                            </span>
                            <div className="flex gap-2">
                              {selectedProduct.colorVariants.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 border p-1.5 rounded-lg bg-muted/30"
                                >
                                  <div
                                    className="w-5 h-5 rounded-full border shadow-sm"
                                    style={{ backgroundColor: c.colorCode }}
                                  />
                                  <span className="text-xs font-medium pr-1">{c.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description Preview */}
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                            Description
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {selectedProduct.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Category Specs & Attributes */}
                {previewTab === 'specs' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" /> Vendor Specifications & Category Attributes
                    </h4>
                    {selectedProduct.dynamicData && Object.keys(selectedProduct.dynamicData).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(selectedProduct.dynamicData).map(([key, val]) => (
                          <div key={key} className="p-3 bg-muted/30 rounded-lg border">
                            <span className="text-xs font-medium text-muted-foreground capitalize block">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {String(val ?? 'N/A')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                        No dynamic category specifications filled by vendor.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Size Chart & Measurements */}
                {previewTab === 'sizes' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" /> Size Guide & Measurements Matrix
                    </h4>
                    {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                      <div className="space-y-4">
                        {selectedProduct.sizes.map((size, idx) => (
                          <Card key={idx}>
                            <CardHeader className="py-3 bg-muted/20">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                Size: <Badge variant="secondary">{size.name}</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-semibold block mb-1 text-muted-foreground">Product Measurements</span>
                                  {size.productMeasurements && size.productMeasurements.length > 0 ? (
                                    <ul className="space-y-1">
                                      {size.productMeasurements.map((m, mIdx) => (
                                        <li key={mIdx} className="flex justify-between border-b py-1">
                                          <span>{m.name}:</span>
                                          <strong className="text-foreground">{m.value} {m.unit}</strong>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-muted-foreground">No product dimensions specified</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-semibold block mb-1 text-muted-foreground">Body Measurements</span>
                                  {size.bodyMeasurements && size.bodyMeasurements.length > 0 ? (
                                    <ul className="space-y-1">
                                      {size.bodyMeasurements.map((bm, bmIdx) => (
                                        <li key={bmIdx} className="flex justify-between border-b py-1">
                                          <span>{bm.name}:</span>
                                          <strong className="text-foreground">{bm.value} {bm.unit}</strong>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-muted-foreground">No body measurements specified</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                        No size guide or measurements configured for this listing.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Color Variants & Stock Matrix */}
                {previewTab === 'variants' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Variant Stock & Inventory Matrix
                    </h4>
                    {selectedProduct.colorVariants && selectedProduct.colorVariants.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProduct.colorVariants.map((c, idx) => (
                          <div key={idx} className="p-4 border rounded-xl bg-card space-y-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-7 w-7 rounded-full border shadow-sm"
                                style={{ backgroundColor: c.colorCode }}
                              />
                              <div>
                                <h5 className="font-bold text-sm text-foreground">{c.name}</h5>
                                <span className="text-xs text-muted-foreground">Hex Code: {c.colorCode}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {c.stocks?.map((st, sIdx) => (
                                <div key={sIdx} className="text-xs bg-muted px-3 py-1.5 rounded-md border flex items-center gap-2">
                                  <span className="font-medium text-foreground">Size {st.size}:</span>
                                  <Badge variant={st.quantity > 0 ? 'default' : 'destructive'} className="text-[10px]">
                                    {st.quantity} units left
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                        No color variants configured.
                      </div>
                    )}
                  </div>
                )}

                {/* 5. QC Scorecard */}
                {previewTab === 'qc' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl">
                      <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" /> Automated QC Quality Score
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          System audit computed from listing completeness & guideline metrics.
                        </p>
                      </div>
                      {getQualityBadge(selectedProduct.qualityScore)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block text-foreground">Main Product Images</span>
                          <span className="text-muted-foreground">
                            {selectedProduct.mainImages?.length || 0} main photos provided.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block text-foreground">Title & Description</span>
                          <span className="text-muted-foreground">
                            Title length ({selectedProduct.name?.length || 0} chars).
                          </span>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block text-foreground">Size Chart & Measurements</span>
                          <span className="text-muted-foreground">
                            {selectedProduct.sizes?.length || 0} sizes configured.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block text-foreground">Pricing & Discount Logic</span>
                          <span className="text-muted-foreground">
                            Price: Rs. {selectedProduct.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Audit History */}
                {previewTab === 'history' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" /> Listing Audit & Review Log
                    </h4>
                    {selectedProduct.reviewHistory && selectedProduct.reviewHistory.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProduct.reviewHistory.map((log, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <Badge
                                variant={log.action === 'approve' ? 'default' : 'destructive'}
                                className="capitalize"
                              >
                                {log.action}
                              </Badge>
                              <span className="text-muted-foreground">
                                {new Date(log.reviewedAt).toLocaleString()}
                              </span>
                            </div>
                            {log.rejectionReasonCategory && (
                              <div className="font-semibold text-foreground">
                                Category: {log.rejectionReasonCategory}
                              </div>
                            )}
                            {log.note && <p className="text-muted-foreground italic">{log.note}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                        No previous review history logged.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 border-t bg-muted/10 flex justify-end gap-3 mt-auto">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                {selectedProduct.status === 'pending_review' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => openRejectModal(selectedProduct)}
                      disabled={submittingAction}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" /> Reject Listing
                    </Button>
                    <Button
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => handleApprove(selectedProduct._id)}
                      disabled={submittingAction}
                    >
                      <Check className="w-4 h-4" /> Approve & Publish
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
