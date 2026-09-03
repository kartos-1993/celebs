import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Flame,
  Heart,
  Layers,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
} from 'lucide-react';

import type { DynamicWidget, SDUIPageLayout } from '@celebs/shared-types';
import { dynamicWidgetSchema } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';

import { DEVICE_PRESETS, DeviceViewport, MOCK_SDUI_LAYOUT } from './widget-preview-types';

import { DeviceFrame } from '@/components/device-frame';

interface WidgetPreviewBoundaryProps {
  layout?: SDUIPageLayout;
  onWidgetSelect?: (widget: DynamicWidget) => void;
  className?: string;
}

function MockWidgetRenderer({ widget }: { widget: DynamicWidget }) {
  const { type, styling, data } = widget;

  switch (type) {
    case 'BANNER_CAROUSEL':
      return (
        <div
          className="relative h-60 w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-md flex flex-col justify-end p-4 text-white group"
          style={{
            backgroundColor: styling?.backgroundColor,
            borderRadius: styling?.borderRadius ? `${styling.borderRadius}px` : undefined,
          }}
        >
          {/* Background Fashion Banner Image */}
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop"
            alt="Hero Banner"
            className="absolute inset-0 h-full w-full object-cover brightness-75 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="relative z-10 space-y-1">
            <span className="inline-block rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Festival Exclusive
            </span>
            <h3 className="text-lg font-extrabold tracking-tight text-white leading-tight">
              {(data as { title?: string })?.title ||
                'Dashain & Tihar Festive Luxe Collection 2026'}
            </h3>
            <p className="text-[11px] text-neutral-200">
              Up to 60% Off Premium Silk, Kurtas &amp; Western Sets
            </p>
          </div>

          {/* Carousel Dots */}
          <div className="absolute bottom-2 right-4 z-10 flex gap-1.5">
            <div className="h-1.5 w-5 rounded-full bg-white" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
          </div>
        </div>
      );

    case 'CAMPAIGN_COUNTDOWN':
      return (
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-red-600 via-rose-600 to-pink-600 p-3.5 text-white shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Flame className="h-4 w-4 text-amber-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                  Limited Flash Sale
                </span>
                <h4 className="text-xs font-black leading-tight text-white">
                  {(data as { campaignName?: string })?.campaignName || 'Dashain Dhamaka Mega Sale'}
                </h4>
              </div>
            </div>

            {/* Live Countdown Cards */}
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center rounded-md bg-black/40 px-1.5 py-1 min-w-[26px]">
                <span className="text-xs font-black text-white font-mono leading-none">47</span>
                <span className="text-[8px] text-white/70 uppercase">hrs</span>
              </div>
              <span className="text-xs font-bold text-white">:</span>
              <div className="flex flex-col items-center rounded-md bg-black/40 px-1.5 py-1 min-w-[26px]">
                <span className="text-xs font-black text-white font-mono leading-none">23</span>
                <span className="text-[8px] text-white/70 uppercase">min</span>
              </div>
              <span className="text-xs font-bold text-white">:</span>
              <div className="flex flex-col items-center rounded-md bg-black/40 px-1.5 py-1 min-w-[26px]">
                <span className="text-xs font-black text-amber-300 font-mono leading-none">48</span>
                <span className="text-[8px] text-white/70 uppercase">sec</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'COMBO_SHOWCASE':
      return (
        <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <div>
                <h4 className="text-xs font-black text-foreground">
                  Curated Festive Combo Bundles
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Complete Outfits with Automatic Multi-Item Discount
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Save Rs. 2,500
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-xl border bg-card p-2.5 space-y-1.5 shadow-xs">
              <div className="relative h-24 overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop"
                  alt="Combo 1"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  3 Items Pack
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground leading-tight truncate">
                Australia Winter Survival Kit
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary">Rs. 8,499</span>
                <span className="text-[10px] text-muted-foreground line-through">Rs. 10,999</span>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-2.5 space-y-1.5 shadow-xs">
              <div className="relative h-24 overflow-hidden rounded-lg bg-neutral-100">
                <img
                  src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&auto=format&fit=crop"
                  alt="Combo 2"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  2 Items Pack
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground leading-tight truncate">
                Tihar Ethnic Silk Saree Set
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary">Rs. 5,999</span>
                <span className="text-[10px] text-muted-foreground line-through">Rs. 7,499</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'CATEGORY_GRID':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black tracking-tight text-foreground">
              Explore Categories
            </h4>
            <span className="text-[10px] font-semibold text-primary">View All</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              {
                name: 'Women Ethnic',
                img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&auto=format&fit=crop',
              },
              {
                name: 'Men Luxury',
                img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200&auto=format&fit=crop',
              },
              {
                name: 'Festive Kurta',
                img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&auto=format&fit=crop',
              },
              {
                name: 'Footwear',
                img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop',
              },
            ].map((cat) => (
              <div key={cat.name} className="flex flex-col items-center gap-1 group cursor-pointer">
                <div className="h-13 w-13 overflow-hidden rounded-full border-2 border-primary/30 p-0.5 shadow-xs transition-transform group-hover:scale-105">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-semibold text-foreground/90 leading-tight truncate w-full">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'PRODUCT_GRID':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h4 className="text-xs font-black tracking-tight text-foreground">
                Trending For You
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Fast-Fashion Daily Drops &amp; Bestsellers
              </p>
            </div>
            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
              Feed <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                title: 'Royal Velvet Embroidered Sherwani',
                price: 7499,
                originalPrice: 11999,
                discount: 37,
                img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop',
                rating: 4.9,
              },
              {
                title: 'Pastel Chiffon Lehenga with Zari Work',
                price: 9299,
                originalPrice: 14999,
                discount: 38,
                img: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop',
                rating: 4.8,
              },
              {
                title: 'Handcrafted Dhaka Print Blazer',
                price: 4999,
                originalPrice: 6999,
                discount: 28,
                img: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop',
                rating: 4.7,
              },
              {
                title: 'Raw Silk Festive Anarkali Gown',
                price: 6499,
                originalPrice: 8999,
                discount: 27,
                img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop',
                rating: 5.0,
              },
            ].map((p, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border bg-card p-2 space-y-1.5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="relative h-36 w-full overflow-hidden rounded-lg bg-neutral-100">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    -{p.discount}%
                  </span>
                  <div className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
                    <Heart className="h-3.5 w-3.5 text-white/90" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold text-foreground">{p.rating}</span>
                  </div>
                  <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-1">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-primary">
                      Rs. {p.price.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-muted-foreground line-through">
                      Rs. {p.originalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center space-y-1">
          <p className="text-xs font-bold text-foreground">Custom Widget: {type}</p>
          <p className="text-[10px] text-muted-foreground font-mono">ID: {widget.id}</p>
        </div>
      );
  }
}

export function WidgetPreviewBoundary({
  layout = MOCK_SDUI_LAYOUT,
  onWidgetSelect,
  className = '',
}: WidgetPreviewBoundaryProps) {
  const [device, setDevice] = useState<DeviceViewport>('iphone');
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const deviceConfig = DEVICE_PRESETS[device];
  const widgets = useMemo(
    () =>
      [...(layout.widgets || [])]
        .filter((w) => w.isActive !== false)
        .sort((a, b) => a.order - b.order),
    [layout.widgets],
  );

  // Validate widgets against shared Zod schema
  const validationResults = useMemo(() => {
    return widgets.map((w) => {
      const res = dynamicWidgetSchema.safeParse(w);
      return {
        id: w.id,
        type: w.type,
        isValid: res.success,
        error: res.success ? null : res.error.message,
      };
    });
  }, [widgets]);

  const allValid = validationResults.every((r) => r.isValid);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={device === 'iphone' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevice('iphone')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" /> iPhone 16 Pro
            </Button>
            <Button
              variant={device === 'pixel' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevice('pixel')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" /> Pixel 8
            </Button>
            <Button
              variant={device === 'tablet' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDevice('tablet')}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Tablet className="h-3.5 w-3.5" /> iPad Mini
            </Button>
          </div>

          <Badge variant={allValid ? 'success' : 'destructive'} className="gap-1 text-xs">
            {allValid ? (
              <>
                <CheckCircle className="h-3 w-3" /> SDUI Schema Valid
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" /> Schema Errors
              </>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJsonInspector(!showJsonInspector)}
            className="h-7 px-2.5 text-xs gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            {showJsonInspector ? 'Hide Schema' : 'Inspect JSON'}
          </Button>
        </div>
      </div>

      {/* Main Preview Frame */}
      <div className="flex justify-center items-start gap-6 overflow-x-auto p-4 bg-muted/20 rounded-2xl border min-h-[600px]">
        {/* Mobile Device Frame */}
        <DeviceFrame width={deviceConfig.width} screenClassName="h-[720px]">
          {/* Screen Content */}
          {/* Simulated App Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur-md">
              <span className="text-xs font-extrabold tracking-tight text-primary">CELEBS</span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {layout.title || 'Storefront'}
              </span>
            </div>

            {/* Widget Stack */}
            <div className="space-y-3 p-3 pb-16">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  onClick={() => onWidgetSelect?.(widget)}
                  className="group relative cursor-pointer rounded-xl transition-all hover:ring-2 hover:ring-primary/60"
                  style={{
                    paddingTop: widget.styling?.paddingVertical
                      ? `${widget.styling.paddingVertical}px`
                      : undefined,
                    paddingBottom: widget.styling?.paddingVertical
                      ? `${widget.styling.paddingVertical}px`
                      : undefined,
                    marginBottom: widget.styling?.marginBottom
                      ? `${widget.styling.marginBottom}px`
                      : undefined,
                  }}
                >
                  <MockWidgetRenderer widget={widget} />

                  <div className="absolute top-1 right-1 hidden rounded-md bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white group-hover:block backdrop-blur-xs">
                    #{widget.order} {widget.type}
                  </div>
                </div>
              ))}
            </div>
        </DeviceFrame>

        {/* JSON Schema Inspector Sidebar */}
        {showJsonInspector && (
          <div className="w-80 space-y-3 rounded-xl border bg-card p-4 shadow-sm text-xs max-h-[720px] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-foreground">SDUI Layout Payload</span>
              <Badge variant="outline">{widgets.length} Widgets</Badge>
            </div>
            <pre className="rounded-lg bg-muted p-2.5 font-mono text-[10px] overflow-x-auto text-muted-foreground leading-relaxed">
              {JSON.stringify(layout, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
