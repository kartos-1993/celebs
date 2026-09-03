import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Gift,
  GripVertical,
  Image,
  LayoutGrid,
  Megaphone,
  Package,
  Plus,
  RotateCcw,
  ShoppingBag,
  Timer,
  Trash2,
} from 'lucide-react';

import type { DynamicWidget, SDUIPageLayout } from '@celebs/shared-types';
import { sduiPageLayoutSchema } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { WidgetPreviewBoundary } from '../../marketing/components/widget-preview-boundary';
import { PlatformSettingsApiService } from '../api';

import { PageLoader } from '@/components/page-loader';
import { useToast } from '@/hooks/use-toast';

interface WidgetTypeMeta {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  hasContentForm: boolean;
}

const WIDGET_TYPES: WidgetTypeMeta[] = [
  {
    type: 'BANNER_CAROUSEL',
    label: 'Banner Carousel',
    description: 'Hero image slider from Marketing → Banners',
    icon: Image,
    hasContentForm: false,
  },
  {
    type: 'CAMPAIGN_COUNTDOWN',
    label: 'Campaign Countdown',
    description: 'Live festival sale countdown strip',
    icon: Timer,
    hasContentForm: false,
  },
  {
    type: 'COMBO_SHOWCASE',
    label: 'Combo Showcase',
    description: 'Curated multi-item bundle cards',
    icon: Gift,
    hasContentForm: false,
  },
  {
    type: 'CATEGORY_GRID',
    label: 'Category Grid',
    description: 'Circular quick links into categories',
    icon: LayoutGrid,
    hasContentForm: false,
  },
  {
    type: 'PRODUCT_GRID',
    label: 'Product Feed',
    description: 'Infinite personalized product feed',
    icon: ShoppingBag,
    hasContentForm: false,
  },
  {
    type: 'PROMO_CARD',
    label: 'Promo Card',
    description: 'Custom CTA banner you fully control',
    icon: Megaphone,
    hasContentForm: true,
  },
];

const widgetMeta = (type: string): WidgetTypeMeta =>
  WIDGET_TYPES.find((w) => w.type === type) ?? {
    type,
    label: type,
    description: 'Custom widget',
    icon: Package,
    hasContentForm: false,
  };

const DEFAULT_LAYOUT_WIDGETS: DynamicWidget[] = [
  { id: 'widget-banner-carousel', type: 'BANNER_CAROUSEL', order: 1, data: {}, isActive: true },
  {
    id: 'widget-campaign-countdown',
    type: 'CAMPAIGN_COUNTDOWN',
    order: 2,
    data: {},
    isActive: true,
  },
  { id: 'widget-combo-showcase', type: 'COMBO_SHOWCASE', order: 3, data: {}, isActive: true },
  { id: 'widget-category-grid', type: 'CATEGORY_GRID', order: 4, data: {}, isActive: true },
  { id: 'widget-product-grid', type: 'PRODUCT_GRID', order: 5, data: {}, isActive: true },
];

const LAYOUT_KEY = 'layout_home';

interface PromoData {
  title?: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  targetRoute?: string;
}

const reindex = (widgets: DynamicWidget[]): DynamicWidget[] =>
  widgets.map((w, i) => ({ ...w, order: i + 1 }));

export default function LayoutEditorPage() {
  const { toast } = useToast();

  const [pageTitle, setPageTitle] = useState('Celebs Storefront');
  const [widgets, setWidgets] = useState<DynamicWidget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const layout = await PlatformSettingsApiService.getLayout(LAYOUT_KEY);
        if (cancelled) return;
        if (layout && Array.isArray(layout.widgets)) {
          setPageTitle(layout.title || 'Celebs Storefront');
          setWidgets(reindex(layout.widgets));
        } else {
          setWidgets(DEFAULT_LAYOUT_WIDGETS);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const mutateWidgets = useCallback((next: DynamicWidget[]) => {
    setWidgets(reindex(next));
    setIsDirty(true);
  }, []);

  const updateWidget = useCallback(
    (id: string, patch: Partial<DynamicWidget>) => {
      mutateWidgets(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    },
    [mutateWidgets, widgets],
  );

  const moveWidget = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= widgets.length || to >= widgets.length)
        return;
      const next = [...widgets];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      mutateWidgets(next);
    },
    [mutateWidgets, widgets],
  );

  const removeWidget = useCallback(
    (id: string) => {
      mutateWidgets(widgets.filter((w) => w.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [mutateWidgets, widgets],
  );

  const duplicateWidget = useCallback(
    (id: string) => {
      const source = widgets.find((w) => w.id === id);
      if (!source) return;
      const index = widgets.findIndex((w) => w.id === id);
      const copy: DynamicWidget = {
        ...source,
        id: `widget-${Date.now()}`,
        data: JSON.parse(JSON.stringify(source.data ?? {})),
      };
      const next = [...widgets];
      next.splice(index + 1, 0, copy);
      mutateWidgets(next);
      setSelectedId(copy.id);
    },
    [mutateWidgets, widgets],
  );

  const addWidget = useCallback(
    (meta: WidgetTypeMeta) => {
      const widget: DynamicWidget = {
        id: `widget-${Date.now()}`,
        type: meta.type,
        order: widgets.length + 1,
        data: {},
        isActive: true,
      };
      mutateWidgets([...widgets, widget]);
      setSelectedId(widget.id);
      setIsAddDialogOpen(false);
    },
    [mutateWidgets, widgets],
  );

  const selected = widgets.find((w) => w.id === selectedId) ?? null;

  const liveLayout: SDUIPageLayout = useMemo(
    () => ({ pageId: 'home', title: pageTitle, widgets }),
    [pageTitle, widgets],
  );

  const handleSave = async () => {
    const layoutToSave: SDUIPageLayout = {
      pageId: 'home',
      title: pageTitle.trim() || 'Celebs Storefront',
      widgets: reindex(widgets),
    };

    const parsed = sduiPageLayoutSchema.safeParse(layoutToSave);
    if (!parsed.success) {
      toast({
        variant: 'destructive',
        title: 'Validation failed',
        description: parsed.error.issues[0]?.message || 'Layout payload is invalid.',
      });
      return;
    }

    try {
      setIsSaving(true);
      await PlatformSettingsApiService.publishLayout(LAYOUT_KEY, parsed.data);
      setIsDirty(false);
      toast({
        title: 'Layout published',
        description: 'Live on the mobile app within ~60 seconds.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Publish failed',
        description: err.message || 'Failed to publish layout.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setWidgets(DEFAULT_LAYOUT_WIDGETS.map((w) => ({ ...w })));
    setPageTitle('Celebs Storefront');
    setSelectedId(null);
    setIsDirty(true);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Home Layout Editor
            {isDirty && (
              <Badge variant="warning" className="uppercase">
                Unsaved changes
              </Badge>
            )}
          </span>
        }
        description="Compose the Daraz-style merchandised storefront. Drag to reorder, hide or edit any block, then publish instantly to every device."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Default
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? 'Publishing…' : 'Publish Layout'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Rail: Widget Stack */}
        <div className="space-y-3">
          <div className="rounded-xl border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Widget Stack · {widgets.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            <div className="max-h-[540px] space-y-1 overflow-y-auto p-2">
              {widgets.length === 0 && (
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="w-full rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Empty storefront — add your first widget
                </button>
              )}

              {widgets.map((widget, index) => {
                const meta = widgetMeta(widget.type);
                const Icon = meta.icon;
                const inactive = widget.isActive === false;
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => {
                      dragIndex.current = index;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex.current !== null) moveWidget(dragIndex.current, index);
                      dragIndex.current = null;
                    }}
                    onClick={() => setSelectedId(widget.id)}
                    className={`group flex cursor-grab items-center gap-2 rounded-lg border px-2 py-2 transition-colors active:cursor-grabbing ${
                      selectedId === widget.id
                        ? 'border-primary bg-primary/5'
                        : 'bg-background hover:bg-muted/50'
                    } ${inactive ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-xs font-semibold">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">#{widget.order}</p>
                    </div>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        aria-label="Move up"
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidget(index, index - 1);
                        }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        aria-label="Move down"
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                        disabled={index === widgets.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidget(index, index + 1);
                        }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        aria-label={inactive ? 'Show widget' : 'Hide widget'}
                        className="rounded p-1 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateWidget(widget.id, { isActive: inactive });
                        }}
                      >
                        {inactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        aria-label="Duplicate widget"
                        className="rounded p-1 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateWidget(widget.id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        aria-label="Delete widget"
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(widget.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspector */}
          {selected && (
            <div className="space-y-4 rounded-xl border bg-card p-3.5 shadow-xs">
              <div className="flex items-center gap-2 border-b pb-2">
                {(() => {
                  const Icon = widgetMeta(selected.type).icon;
                  return (
                    <>
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{widgetMeta(selected.type).label}</span>
                      <Badge variant="outline" className="ml-auto">
                        #{selected.order}
                      </Badge>
                    </>
                  );
                })()}
              </div>

              {widgetMeta(selected.type).hasContentForm ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Content
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        className="h-8 text-xs"
                        value={(selected.data as PromoData).title ?? ''}
                        placeholder="Dashain Dhamaka Sale"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            data: { ...(selected.data as PromoData), title: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Subtitle</Label>
                      <Input
                        className="h-8 text-xs"
                        value={(selected.data as PromoData).subtitle ?? ''}
                        placeholder="Flat 60% off everything"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            data: { ...(selected.data as PromoData), subtitle: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Badge</Label>
                      <Input
                        className="h-8 text-xs"
                        value={(selected.data as PromoData).badge ?? ''}
                        placeholder="FESTIVE"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            data: { ...(selected.data as PromoData), badge: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CTA Text</Label>
                      <Input
                        className="h-8 text-xs"
                        value={(selected.data as PromoData).ctaText ?? ''}
                        placeholder="Shop Now"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            data: { ...(selected.data as PromoData), ctaText: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Target Route</Label>
                      <Input
                        className="h-8 text-xs"
                        value={(selected.data as PromoData).targetRoute ?? ''}
                        placeholder="/category/festive"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            data: { ...(selected.data as PromoData), targetRoute: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
                  Content for this block is managed automatically from its own module (banners,
                  campaigns, combos, categories, products).
                </p>
              )}

              {/* Styling */}
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Styling
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-8 w-9 cursor-pointer rounded border"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(selected.styling?.backgroundColor ?? '')
                            ? (selected.styling?.backgroundColor as string)
                            : '#ffffff'
                        }
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            styling: { ...selected.styling, backgroundColor: e.target.value },
                          })
                        }
                      />
                      <Input
                        className="h-8 flex-1 font-mono text-xs"
                        value={selected.styling?.backgroundColor ?? ''}
                        placeholder="#1E1E2E"
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            styling: { ...selected.styling, backgroundColor: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                  {(
                    [
                      ['borderRadius', 'Corner Radius'],
                      ['paddingVertical', 'Padding V'],
                      ['paddingHorizontal', 'Padding H'],
                      ['marginBottom', 'Bottom Gap'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-xs"
                        value={selected.styling?.[field] ?? ''}
                        onChange={(e) =>
                          updateWidget(selected.id, {
                            styling: {
                              ...selected.styling,
                              [field]: e.target.value === '' ? undefined : Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live Preview · updates as you edit
            </span>
            <div className="w-full max-w-[220px]">
              <Input
                className="h-7 text-xs"
                value={pageTitle}
                onChange={(e) => {
                  setPageTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Storefront title shown in-app"
              />
            </div>
          </div>
          <WidgetPreviewBoundary layout={liveLayout} />
        </div>
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Widget Block</DialogTitle>
            <DialogDescription>
              Pick a block to append to the bottom of the stack — then drag it anywhere.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {WIDGET_TYPES.map((meta) => {
              const Icon = meta.icon;
              return (
                <button
                  key={meta.type}
                  onClick={() => addWidget(meta)}
                  className="group flex flex-col items-start gap-1.5 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold">{meta.label}</p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
