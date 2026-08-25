# RFC-005: Server-Driven UI (SDUI) & Dynamic Mobile Homepage Architecture

**Status**: Proposed / Approved  
**Authors**: Celebs Core Architecture Team  
**Scope**: `apps/mobile`, `apps/api`, `apps/web-admin`, `packages/shared-types`, Database

---

## 1. Executive Summary & Problem Statement

In high-velocity fashion e-commerce (such as Shein, Daraz, and Myntra), the mobile application homepage accounts for **over 80% of top-of-funnel customer traffic and immediate purchasing intent**.

Currently, the mobile homepage (`apps/mobile/src/app/(tabs)/index.tsx`) hardcodes the visual hierarchy:

- `BannerCarousel`
- `CampaignCountdownBanner` (Festival Campaign Banner)
- `ComboBundleShowcase` (Curated Festive Combos)
- `CategoryGrid`
- `ProductGrid` (Infinite Feed)

### The Core Business & Technical Bottlenecks:

1. **App Store Review Delays**: Marketing events (e.g. Dashain Flash Deals, Black Friday, Weekend Drops) start and end abruptly. Waiting 2 to 4 days for Apple and Google app reviews makes real-time campaign execution impossible.
2. **Post-Campaign Conversion Slump**: If an expired campaign banner remains visible on the mobile app after a festival ends, customer trust and checkout conversion rates plummet.
3. **Hardcoded Dispatcher Anti-Pattern**: Writing `switch (widget.type)` statements directly inside screens forces developers to modify and redeploy screen files every time a new marketing section is introduced.
4. **Zero Multi-Screen Reusability**: Campaign landing pages, brand storefronts, and category discovery feeds cannot reuse the layout engine without duplicating code.

---

## 2. Server-Driven UI (SDUI) Paradigm

Server-Driven UI decouples **Data & Layout Composition** from **Client-side Rendering**:

- The **Backend (API)** dictates _what_ widgets appear, in _what order_, with _what configuration_, and under _what time window_.
- The **Mobile App (React Native)** acts as a pure rendering engine powered by a **Decoupled Component Registry**, completely agnostic of specific marketing campaigns.

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   Superadmin Web Portal (Web-Admin)                    │
 │               Visual Drag-and-Drop Homepage Layout Studio              │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ PUT /api/v1/layout/screens/HOME
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Backend Layout Service & Cache                    │
 │  • PostgreSQL persistent storage (`ScreenLayout` & `LayoutWidget`)     │
 │  • Upstash Redis Cache Layer (< 2ms response time)                     │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ GET /api/v1/layout/home
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    Universal <DynamicLayout /> Engine                  │
 │               (Zero switch statements, zero hardcoded types)           │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ Lookup in WIDGET_REGISTRY[type]
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                       Decoupled Widget Registry                        │
 │  • BANNER_CAROUSEL          ──>  <BannerCarousel />                    │
 │  • CAMPAIGN_COUNTDOWN       ──>  <CampaignCountdownBanner />           │
 │  • COMBO_BUNDLE_SHOWCASE    ──>  <ComboBundleShowcase />               │
 │  • CATEGORY_GRID            ──>  <CategoryGrid />                      │
 │  • FLASH_SALE_STRIP         ──>  <FlashSaleStrip />                    │
 │  • PRODUCT_GRID             ──>  <ProductGrid />                       │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Universal Widget Contract (`@celebs/shared-types`)

Every dynamic widget follows a standardized, strongly typed contract:

```typescript
// packages/shared-types/src/types/layout.ts

export type WidgetType =
  | 'BANNER_CAROUSEL'
  | 'CAMPAIGN_COUNTDOWN'
  | 'COMBO_BUNDLE_SHOWCASE'
  | 'CATEGORY_GRID'
  | 'FLASH_DEALS_STRIP'
  | 'STORY_CIRCLES'
  | 'PRODUCT_GRID'
  | 'RICH_BANNER'
  | 'CUSTOM_HTML_BANNER';

export interface DynamicWidgetStyling {
  paddingTop?: number;
  paddingBottom?: number;
  paddingHorizontal?: number;
  backgroundColor?: string;
  borderRadius?: number;
  marginBottom?: number;
}

export interface DynamicWidgetAnalytics {
  trackingId: string;
  campaignTag?: string;
  sourceSection?: string;
}

export interface DynamicWidget<TData = Record<string, unknown>> {
  id: string;
  type: WidgetType | string;
  order: number;
  enabled: boolean;
  schedule?: {
    startsAt?: string; // ISO 8601
    endsAt?: string; // Auto-expires after festive countdown
  };
  data: TData;
  styling?: DynamicWidgetStyling;
  analytics?: DynamicWidgetAnalytics;
}

export interface ScreenLayoutResponse {
  screenId: string; // "HOME", "TRENDS", "BRAND_STOREFRONT"
  version: number;
  title?: string;
  widgets: DynamicWidget[];
}

export interface WidgetProps<TData = Record<string, unknown>> {
  widget: DynamicWidget<TData>;
  onAction?: (actionType: string, payload: unknown) => void;
}
```

---

## 4. Mobile Client Architecture (`apps/mobile`)

### 4.1 The Decoupled Widget Registry (`widget-registry.ts`)

Instead of writing switch statements inside screen files, widgets self-register in an isolated lookup dictionary:

```typescript
// apps/mobile/src/features/layout/widget-registry.ts
import React from 'react';
import type { WidgetProps } from '@celebs/shared-types';

import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { CampaignCountdownBanner } from '@/features/home/components/campaign-countdown-banner';
import { ComboBundleShowcase } from '@/features/home/components/combo-bundle-showcase';
import { CategoryGrid } from '@/features/categories/components/category-grid';
import { ProductGrid } from '@/features/products/components/product-grid';

// Unknown widgets fail silently or render a fallback to ensure backward compatibility
const UnknownWidgetFallback: React.FC<WidgetProps> = () => null;

export const WIDGET_REGISTRY: Record<string, React.ComponentType<WidgetProps<never>>> = {
  BANNER_CAROUSEL: BannerCarousel as React.ComponentType<WidgetProps<never>>,
  CAMPAIGN_COUNTDOWN: CampaignCountdownBanner as React.ComponentType<WidgetProps<never>>,
  COMBO_BUNDLE_SHOWCASE: ComboBundleShowcase as React.ComponentType<WidgetProps<never>>,
  CATEGORY_GRID: CategoryGrid as React.ComponentType<WidgetProps<never>>,
  PRODUCT_GRID: ProductGrid as React.ComponentType<WidgetProps<never>>,
};

/** Dynamic registration helper for extensible modular widgets */
export function registerWidget(type: string, component: React.ComponentType<WidgetProps<never>>) {
  WIDGET_REGISTRY[type] = component;
}
```

---

### 4.2 Generic `<DynamicLayout />` Component

```tsx
// apps/mobile/src/features/layout/components/dynamic-layout.tsx
import React, { memo } from 'react';
import { View } from 'react-native';
import type { DynamicWidget } from '@celebs/shared-types';
import { WIDGET_REGISTRY } from '../widget-registry';

interface DynamicLayoutProps {
  widgets: DynamicWidget[];
  onWidgetAction?: (actionType: string, payload: unknown) => void;
}

export const DynamicLayout = memo(function DynamicLayout({
  widgets,
  onWidgetAction,
}: DynamicLayoutProps) {
  return (
    <>
      {widgets.map((widget) => {
        // 1. Verify widget is active
        if (!widget.enabled) return null;

        // 2. Client-side time guard (handles cached layouts after sale expiry)
        if (widget.schedule?.endsAt && new Date(widget.schedule.endsAt) < new Date()) {
          return null;
        }

        // 3. Resolve from component registry
        const WidgetComponent = WIDGET_REGISTRY[widget.type];
        if (!WidgetComponent) {
          // Gracefully ignore newer widget types on older app versions without crashing
          return null;
        }

        return (
          <View
            key={widget.id}
            style={{
              paddingTop: widget.styling?.paddingTop ?? 0,
              paddingBottom: widget.styling?.paddingBottom ?? 0,
              paddingHorizontal: widget.styling?.paddingHorizontal ?? 0,
              backgroundColor: widget.styling?.backgroundColor ?? 'transparent',
              marginBottom: widget.styling?.marginBottom ?? 0,
              borderRadius: widget.styling?.borderRadius ?? 0,
            }}
          >
            <WidgetComponent widget={widget as never} onAction={onWidgetAction} />
          </View>
        );
      })}
    </>
  );
});
```

---

### 4.3 Clean & Agnostic `HomeScreen`

With the SDUI engine in place, [`HomeScreen`](file:///c:/celebs/celebs/apps/mobile/src/app/%28tabs%29/index.tsx) contains zero marketing or festive hardcoding:

```tsx
// apps/mobile/src/app/(tabs)/index.tsx
import React, { useCallback, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  useColorScheme,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { DynamicLayout } from '@/features/layout/components/dynamic-layout';
import { useScreenLayout } from '@/features/layout/hooks/use-screen-layout';
import { styles } from '@/features/home/styles/home.styles';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const [scrollY, setScrollY] = useState(0);

  const { data: layout, isLoading, refetch } = useScreenLayout('HOME');

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }, []);

  const handleWidgetAction = useCallback((actionType: string, payload: unknown) => {
    // Universal analytics & deep-linking handler
    console.log('Widget action triggered:', actionType, payload);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <StatusBar
        barStyle={
          scrollY > 50 ? (scheme === 'dark' ? 'light-content' : 'dark-content') : 'light-content'
        }
        translucent={true}
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={scheme === 'dark' ? Palette.white : Palette.black}
            progressViewOffset={90}
          />
        }
      >
        <DynamicLayout widgets={layout?.widgets || []} onWidgetAction={handleWidgetAction} />
      </ScrollView>

      <AppHeader transparent={true} scrollY={scrollY} showSubHeader={true} initialSubTab="Men" />
    </ThemedView>
  );
}
```

---

## 5. Backend Layout Engine & Database Model

### 5.1 Prisma Schema (`apps/api/src/db/schema.prisma`)

```prisma
model ScreenLayout {
  id          String         @id @default(uuid())
  screenCode  String         @unique @map("screen_code") // "HOME", "TRENDS", "EXPLORE", "BRAND_STORE"
  title       String
  description String?
  version     Int            @default(1)
  isPublished Boolean        @default(true) @map("is_published")

  widgets     LayoutWidget[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([screenCode, isPublished])
}

model LayoutWidget {
  id             String       @id @default(uuid())
  screenLayoutId String       @map("screen_layout_id")
  screenLayout   ScreenLayout @relation(fields: [screenLayoutId], references: [id], onDelete: Cascade)

  type           String       // "BANNER_CAROUSEL", "CAMPAIGN_COUNTDOWN", etc.
  order          Int          @default(0)
  enabled        Boolean      @default(true)

  startsAt       DateTime?    @map("starts_at")
  endsAt         DateTime?    @map("ends_at")

  data           Json         // Flexible widget parameters (banners, text, product IDs)
  styling        Json?        // Margin, padding, background colors
  analyticsTag   String?      @map("analytics_tag")

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([screenLayoutId, order])
  @@index([enabled, startsAt, endsAt])
}
```

---

## 6. High Conversion Rate (CRO) Impact

| Capability                        | Static Hardcoded App                              | SDUI Dynamic Homepage                                       |
| :-------------------------------- | :------------------------------------------------ | :---------------------------------------------------------- |
| **Festival Season Switching**     | Requires new App Store binary build (2–4 days)    | **Instant 1-Click Toggle** in Superadmin UI                 |
| **Auto-Expiry of Flash Sales**    | Countdown reaches zero but expired banner remains | **Auto-hides at 00:00:00** based on server schedule         |
| **A/B Testing Hero Layouts**      | Hardcoded for all users                           | **Dynamic variant serving per user segment**                |
| **New Marketing Widget Rollouts** | Modify `index.tsx` + risk regression bugs         | **Add component to registry without touching screens**      |
| **Multi-Surface Reuse**           | Code locked only to Home Tab                      | **Powers Brand Storefronts, Explore, and Flash Sale pages** |
