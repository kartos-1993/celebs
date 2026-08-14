import { useState } from 'react';
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
import { Button } from '@celebs/shared-ui/components/button';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { Dialog, DialogContent } from '@celebs/shared-ui/components/dialog';
import type { CategoryRef, ProductQueueItem } from './types';
import { QualityBadge } from './quality-badge';

type PreviewTab = 'overview' | 'specs' | 'sizes' | 'variants' | 'qc' | 'history';

const PREVIEW_TABS: Array<{ id: PreviewTab; label: string; icon: typeof Eye }> = [
  { id: 'overview', label: 'Live PDP Preview', icon: Eye },
  { id: 'specs', label: 'Category Specs & Attributes', icon: Tag },
  { id: 'sizes', label: 'Size Chart & Measurements', icon: Ruler },
  { id: 'variants', label: 'Color Variants & Stock', icon: Layers },
  { id: 'qc', label: 'QC Scorecard', icon: ShieldCheck },
  { id: 'history', label: 'Audit History', icon: History },
];

const getCategoryName = (category?: CategoryRef | string): string => {
  if (!category) return 'Uncategorized';
  if (typeof category === 'string') return category;
  return category.name;
};

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{product.name}</h2>
                <QualityBadge score={product.qualityScore} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>
                  Vendor:{' '}
                  <strong className="text-foreground">{product.vendorName || 'Independent'}</strong>
                </span>
                <span>•</span>
                <span>
                  Category:{' '}
                  <strong className="text-foreground">{getCategoryName(product.category)}</strong>
                </span>
                <span>•</span>
                <span>
                  Brand: <strong className="text-foreground">{product.brand || 'N/A'}</strong>
                </span>
              </div>
            </div>

            {/* Device toggle */}
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

          {/* ── Tab navigation ─────────────────────────────────────── */}
          <div className="flex border-b bg-background px-4 overflow-x-auto text-xs font-medium">
            {PREVIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = previewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPreviewTab(tab.id)}
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

          {/* ── Tab body ───────────────────────────────────────────── */}
          <div className="p-6">
            {/* 1. Live PDP preview */}
            {previewTab === 'overview' && (
              <div
                className={
                  previewDevice === 'mobile'
                    ? 'max-w-sm mx-auto border-4 border-foreground/20 rounded-2xl p-4 shadow-2xl bg-background'
                    : ''
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Gallery */}
                  <div className="space-y-3">
                    <div className="relative aspect-square rounded-xl overflow-hidden border bg-muted group">
                      <img
                        src={activePreviewImage || '/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur">
                        {product.mainImages?.length || 0} Main Images
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {(product.mainImages ?? []).map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setActivePreviewImage(imageUrl)}
                          className={`h-16 w-16 rounded-md overflow-hidden border-2 transition-all ${
                            activePreviewImage === imageUrl
                              ? 'border-primary scale-95'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = '/placeholder.svg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {product.brand || 'No Brand'}
                      </Badge>
                      <h3 className="text-2xl font-bold text-foreground">{product.name}</h3>
                      <div className="flex items-baseline gap-3 mt-2">
                        <span className="text-2xl font-extrabold text-foreground">
                          Rs. {product.price.toLocaleString()}
                        </span>
                        {product.discountedPrice && (
                          <>
                            <span className="text-base text-muted-foreground line-through">
                              Rs. {product.discountedPrice.toLocaleString()}
                            </span>
                            <Badge className="bg-destructive text-destructive-foreground">
                              {discountPercent}% OFF
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {(product.sizes ?? []).length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                          Available Sizes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(product.sizes ?? []).map((size, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="px-3 py-1 text-sm font-medium"
                            >
                              {size.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(product.colorVariants ?? []).length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                          Color Options ({product.colorVariants?.length})
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {(product.colorVariants ?? []).map((variant, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 border p-1.5 rounded-lg bg-muted/30"
                            >
                              <div
                                className="w-5 h-5 rounded-full border shadow-sm"
                                style={{ backgroundColor: variant.colorCode }}
                              />
                              <span className="text-xs font-medium pr-1">{variant.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Description
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {product.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Category specs */}
            {previewTab === 'specs' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Vendor Specifications & Category
                  Attributes
                </h4>
                {product.dynamicData && Object.keys(product.dynamicData).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(product.dynamicData).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/30 rounded-lg border">
                        <span className="text-xs font-medium text-muted-foreground capitalize block">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {String(value ?? 'N/A')}
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
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
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
                    {(product.colorVariants ?? []).map((variant, index) => (
                      <div key={index} className="p-4 border rounded-xl bg-card space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-7 w-7 rounded-full border shadow-sm"
                            style={{ backgroundColor: variant.colorCode }}
                          />
                          <div>
                            <h5 className="font-bold text-sm text-foreground">{variant.name}</h5>
                            <span className="text-xs text-muted-foreground">
                              Hex Code: {variant.colorCode}
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
                                className="text-[10px]"
                              >
                                {stock.quantity} units left
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

            {/* 5. QC scorecard */}
            {previewTab === 'qc' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl">
                  <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" /> Automated QC Quality
                      Score
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      System audit computed from listing completeness & guideline metrics.
                    </p>
                  </div>
                  <QualityBadge score={product.qualityScore} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border rounded-lg flex items-start gap-3 bg-card">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
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
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
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
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
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
                    {(product.reviewHistory ?? []).map((log, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-card text-xs space-y-1">
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

          {/* ── Footer actions ─────────────────────────────────────── */}
          <div className="p-4 border-t bg-muted/10 flex justify-end gap-3 mt-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {product.status === 'pending_review' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => onReject(product)}
                  disabled={isSubmitting}
                  className="gap-1"
                >
                  <X className="w-4 h-4" /> Reject Listing
                </Button>
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  onClick={() => onApprove(product.id)}
                  disabled={isSubmitting}
                >
                  <Check className="w-4 h-4" /> Approve & Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
