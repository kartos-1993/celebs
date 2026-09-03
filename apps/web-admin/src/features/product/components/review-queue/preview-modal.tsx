import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Eye,
  History,
  Info,
  Layers,
  Monitor,
  Ruler,
  ShieldCheck,
  Smartphone,
  Tag,
  X,
} from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import { Tabs, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import { isMulticolorVariant, resolveColorCode } from '../../utils/add-product-helpers';
import { formatProductCategoryBreadcrumb } from '../../utils/category-format';

import { PdpOverviewPreview } from './preview-modal-overview';
import { QualityBadge } from './quality-badge';
import type { ProductQueueItem } from './types';

import { DeviceFrame } from '@/components/device-frame';

type PreviewTab = 'overview' | 'specs' | 'sizes' | 'variants' | 'qc' | 'history';

/** Structural containers inside dynamicData that are not user-facing attributes. */
const STRUCTURAL_DYNAMIC_KEYS = new Set(['variantFields', 'uploadedAssets', 'sku']);

/**
 * Renders any attribute payload (string, number, boolean, array, option or
 * measurement object) as a single human-readable line.
 */
function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatAttributeValue(item)).join(', ') || 'N/A';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.value !== undefined && obj.unit) return `${String(obj.value)} ${String(obj.unit)}`;
    const labeled = obj.label ?? obj.name ?? obj.title ?? obj.text;
    if (labeled !== undefined) return formatAttributeValue(labeled);
    return JSON.stringify(obj);
  }
  return String(value);
}

const PREVIEW_TABS: Array<{ id: PreviewTab; label: string; icon: typeof Eye }> = [
  { id: 'overview', label: 'Live PDP Preview', icon: Eye },
  { id: 'specs', label: 'Category Specs & Attributes', icon: Tag },
  { id: 'sizes', label: 'Size Chart & Measurements', icon: Ruler },
  { id: 'variants', label: 'Color Variants & Stock', icon: Layers },
  { id: 'qc', label: 'QC Scorecard', icon: ShieldCheck },
  { id: 'history', label: 'Audit History', icon: History },
];

interface PreviewModalProps {
  product: ProductQueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onApprove: (id: string) => void;
  onReject: (product: ProductQueueItem) => void;
}

export function PreviewModal({
  product,
  open,
  onOpenChange,
  isSubmitting,
  onApprove,
  onReject,
}: PreviewModalProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activePreviewImage, setActivePreviewImage] = useState<string>(
    product.mainImages?.[0] || '',
  );
  const [previewTab, setPreviewTab] = useState<PreviewTab>('overview');

  const discountPercent =
    product.discountedPrice && product.price > 0
      ? Math.round(((product.price - product.discountedPrice) / product.price) * 100)
      : 0;

  /**
   * dynamicData is stored as { values: {...attributes}, variantFields: [...],
   * uploadedAssets: {...} }. The attribute grid must render the entries inside
   * `values` (falling back to the record itself for legacy flat products),
   * never the structural containers.
   */
  const specEntries = useMemo(() => {
    const record = product.dynamicData as Record<string, unknown> | undefined;
    if (!record) return [] as Array<[string, unknown]>;
    const source = (
      record.values && typeof record.values === 'object' && !Array.isArray(record.values)
        ? record.values
        : record
    ) as Record<string, unknown>;
    return Object.entries(source).filter(([key, value]) => {
      if (STRUCTURAL_DYNAMIC_KEYS.has(key)) return false;
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    });
  }, [product.dynamicData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Live preview and quality inspection details for {product.name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col h-full">
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{product.name}</h2>
                <QualityBadge score={product.qualityScore} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span>
                  Vendor:{' '}
                  <strong className="text-foreground">{product.vendorName || 'Independent'}</strong>
                </span>
                <span>•</span>
                <span>
                  Category:{' '}
                  <strong className="text-foreground">
                    {formatProductCategoryBreadcrumb(product)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Brand: <strong className="text-foreground">{product.brand || 'N/A'}</strong>
                </span>
              </div>
            </div>

            {/* Device toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border">
              <Button
                type="button"
                variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
                className="gap-1.5 h-7 px-2.5 text-xs"
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
                className="gap-1.5 h-7 px-2.5 text-xs"
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </Button>
            </div>
          </div>

          {/* ── Tab navigation ─────────────────────────────────────── */}
          <div className="border-b bg-background px-4">
            <Tabs value={previewTab} onValueChange={(v: string) => setPreviewTab(v as PreviewTab)}>
              <TabsList className="no-scrollbar bg-transparent h-auto w-full justify-start gap-1 rounded-none p-0 overflow-x-auto">
                {PREVIEW_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"
                    >
                      <Icon className="w-3.5 h-3.5" /> {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* ── Tab body ───────────────────────────────────────────── */}
          <div className="p-4 sm:p-6">
            {/* 1. Live PDP preview */}
            {previewTab === 'overview' &&
              (previewDevice === 'mobile' ? (
                <DeviceFrame className="mx-auto w-full max-w-sm">
                  <PdpOverviewPreview
                    product={product}
                    activePreviewImage={activePreviewImage}
                    onSelectImage={setActivePreviewImage}
                    discountPercent={discountPercent}
                  />
                </DeviceFrame>
              ) : (
                <PdpOverviewPreview
                  product={product}
                  activePreviewImage={activePreviewImage}
                  onSelectImage={setActivePreviewImage}
                  discountPercent={discountPercent}
                />
              ))}

            {/* 2. Category specs */}
            {previewTab === 'specs' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Vendor Specifications & Category
                  Attributes
                </h4>
                {specEntries.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {specEntries.map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/30 rounded-lg border min-w-0">
                        <span className="text-xs font-medium text-muted-foreground capitalize block">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="text-sm font-semibold text-foreground break-words block">
                          {formatAttributeValue(value)}
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

            {/* 3. Sizes */}
            {previewTab === 'sizes' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" /> Size Guide & Measurements Matrix
                </h4>
                {(product.sizes ?? []).length > 0 ? (
                  <div className="space-y-4">
                    {(product.sizes ?? []).map((size, index) => (
                      <Card key={index}>
                        <CardHeader className="py-3 bg-muted/20">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            Size: <Badge variant="secondary">{size.name}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-semibold block mb-1 text-muted-foreground">
                                Product Measurements
                              </span>
                              {(size.productMeasurements ?? []).length > 0 ? (
                                <ul className="space-y-1">
                                  {(size.productMeasurements ?? []).map((measurement, mIndex) => (
                                    <li key={mIndex} className="flex justify-between border-b py-1">
                                      <span>{measurement.name}:</span>
                                      <strong className="text-foreground">
                                        {measurement.value} {measurement.unit}
                                      </strong>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground">
                                  No product dimensions specified
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold block mb-1 text-muted-foreground">
                                Body Measurements
                              </span>
                              {(size.bodyMeasurements ?? []).length > 0 ? (
                                <ul className="space-y-1">
                                  {(size.bodyMeasurements ?? []).map((measurement, mIndex) => (
                                    <li key={mIndex} className="flex justify-between border-b py-1">
                                      <span>{measurement.name}:</span>
                                      <strong className="text-foreground">
                                        {measurement.value} {measurement.unit}
                                      </strong>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground">
                                  No body measurements specified
                                </span>
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

            {/* 4. Variants & stock */}
            {previewTab === 'variants' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Variant Stock & Inventory Matrix
                </h4>
                {(product.colorVariants ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(product.colorVariants ?? []).map((variant, index) => {
                      const swatchImg =
                        variant.swatch ||
                        (variant.images && variant.images.length > 0 ? variant.images[0] : null);
                      const isMulti = isMulticolorVariant(`${variant.name} ${variant.colorCode}`);
                      const safeBg = resolveColorCode(variant.colorCode || variant.name);

                      return (
                        <div key={index} className="p-4 border rounded-xl bg-card space-y-3">
                          <div className="flex items-center gap-3">
                            {swatchImg ? (
                              <img
                                src={swatchImg}
                                alt={variant.name}
                                className="h-7 w-7 rounded-full object-cover border shadow-xs"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : isMulti ? (
                              <div
                                className="h-7 w-7 rounded-full border shadow-xs"
                                style={{
                                  background:
                                    'conic-gradient(#ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                                }}
                              />
                            ) : (
                              <div
                                className="h-7 w-7 rounded-full border shadow-xs"
                                style={{ backgroundColor: safeBg }}
                              />
                            )}
                            <div>
                              <h5 className="text-sm font-semibold text-foreground">{variant.name}</h5>
                              <span className="text-xs text-muted-foreground">
                                {isMulti ? 'Multicolor / Fabric Pattern' : `Color Code: ${safeBg}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(variant.stocks ?? []).map((stock, stockIndex) => (
                              <div
                                key={stockIndex}
                                className="text-xs bg-muted px-3 py-1.5 rounded-md border flex items-center gap-2"
                              >
                                <span className="font-medium text-foreground">
                                  Size {stock.size}:
                                </span>
                                <Badge
                                  variant={stock.quantity > 0 ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {stock.quantity} units left
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                    No color variants configured.
                  </div>
                )}
              </div>
            )}

            {/* 5. QC scorecard */}
            {previewTab === 'qc' && (
              <div className="space-y-4">
                <div className="flex flex-col items-stretch gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <ShieldCheck className="w-5 h-5 text-success" /> Automated QC Quality Score
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      System audit computed from listing completeness & guideline metrics.
                    </p>
                  </div>
                  <QualityBadge score={product.qualityScore} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <span className="font-semibold block text-foreground">
                        Main Product Images
                      </span>
                      <span className="text-muted-foreground">
                        {product.mainImages?.length || 0} main photos provided.
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div>
                      <span className="font-semibold block text-foreground">
                        Title & Description
                      </span>
                      <span className="text-muted-foreground">
                        Title length ({product.name?.length || 0} chars).
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                    <Info className="w-4 h-4 text-info mt-0.5" />
                    <div>
                      <span className="font-semibold block text-foreground">
                        Size Chart & Measurements
                      </span>
                      <span className="text-muted-foreground">
                        {product.sizes?.length || 0} sizes configured.
                      </span>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                    <Info className="w-4 h-4 text-info mt-0.5" />
                    <div>
                      <span className="font-semibold block text-foreground">
                        Pricing & Discount Logic
                      </span>
                      <span className="text-muted-foreground">
                        Price: Rs. {product.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Audit history */}
            {previewTab === 'history' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Listing Audit & Review Log
                </h4>
                {(product.reviewHistory ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(product.reviewHistory ?? []).map((log, index) => {
                      const timestamp = log.editedAt ?? log.reviewedAt;
                      const isEdit = log.action === 'edited';
                      return (
                        <div
                          key={index}
                          className="p-3 border rounded-lg bg-card text-xs space-y-1"
                        >
                          <div className="flex justify-between items-center">
                            {isEdit ? (
                              <Badge variant="outline" className="capitalize">
                                Edited{log.isCrossStoreEdit ? ' · Platform' : ''}
                              </Badge>
                            ) : (
                              <Badge
                                variant={log.action === 'approve' ? 'default' : 'destructive'}
                                className="capitalize"
                              >
                                {log.action}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">
                              {timestamp ? new Date(timestamp).toLocaleString() : '—'}
                            </span>
                          </div>

                          {isEdit && (log.changes?.length ?? 0) > 0 ? (
                            <ul className="space-y-0.5 text-muted-foreground">
                              {(log.changes ?? []).map((change) => (
                                <li key={change.field} className="truncate">
                                  <span className="font-medium text-foreground capitalize">
                                    {change.field.replace(/([A-Z])/g, ' $1')}:
                                  </span>{' '}
                                  {change.from} → {change.to}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {!isEdit && log.rejectionReasonCategory && (
                            <div className="font-semibold text-foreground">
                              Category: {log.rejectionReasonCategory}
                            </div>
                          )}
                          {!isEdit && log.note && (
                            <p className="text-muted-foreground italic">{log.note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground border rounded-lg bg-muted/10">
                    No previous review history logged.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer actions ─────────────────────────────────────── */}
          <div className="mt-auto flex flex-col-reverse gap-2 border-t bg-muted/10 p-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Close
            </Button>
            {product.status === 'pending_review' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => onReject(product)}
                  disabled={isSubmitting}
                  className="w-full gap-1 sm:w-auto"
                >
                  {isSubmitting ? <Spinner size="sm" /> : <X className="w-4 h-4" />} Reject Listing
                </Button>
                <Button
                  variant="default"
                  className="w-full gap-1 bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
                  onClick={() => onApprove(product.id)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner size="sm" /> : <Check className="w-4 h-4" />} Approve
                  &amp; Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
