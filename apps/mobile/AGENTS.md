# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Mobile Design System — Product Page (reference)

Established in commit `2a7809c` (feat/mobranding-and-product-polish). The product
detail page is the canonical reference for commerce screen styling. Files:

- Screen: `src/app/product/[id].tsx`
- Styles: `src/features/products/styles/product.styles.ts`
- Variant selector: `src/features/products/components/product-variant-selector.tsx` + `.styles.ts`

## Design language

SHEIN-inspired marketplace PDP: black/white/gray base, red only for discounts,
green only for shipping highlights, gold only for stars. Blue brand color is NOT
used on this screen. Dense layout — every gap is intentional, compact tap targets.

## Tokens (from `@/constants/theme`)

- CTA / selected states: `Palette.gray900` (black), white text
- Page bg: `Palette.white`; section separators: `sectionBand` = 8px `Palette.gray100` band
- Price: `FontSize.headline` (24) `FontWeight.extrabold`; strike original `gray400`;
  discount badge `dangerTint` bg + `danger` text
- Body text: 13–15px (`small`/`base`); meta text: `caption` (12) `gray500/600`;
  measurement text: `micro` (10), labels bold `gray800`, values `gray600`

## Layout order (top → bottom)

1. **Solid white header** (`headerBar`, not floating): back ›, grey search pill
   (→ explore tab), menu `MoreHorizontal` (Alert action sheet), bag icon
   `ShoppingBag` + count badge, share icon. Image gallery starts BELOW the
   header — never behind it.
2. Gallery (dots kept), flush to info section (12px top gap only)
3. Price row → title (2 lines, `medium`) with inline rating ★ 4.8 (124) ›
4. Section band
5. Variants: color thumbnails 44px (selected = 2px black border) → size pills
   28px tall / min-width 40 (selected = black fill) → grey measurement box
   (`#F7F7F8`, 4px vertical padding, 10px text, bold labels) → Size Guide /
   Check My Size links (visual only for now)
6. Section band → service rows (icon + text + chevron, 44px min, hairline
   dividers; green highlight for free-shipping threshold)
7. Section band → reviews summary (big 4.8 + star + count + "View more ›")
8. Section band → description
9. **Sticky bottom bar**: bordered 48px wishlist square (login-gated →
   `router.push('/(tabs)/me')` directly, no alert) + black pill "Add to Cart"
   (text only, no icon), 48px tall, `Radius.pill`

## Conventions

- `ThemedText`/`ThemedView` + `StyleSheet.create` in a sibling `.styles.ts` — no inline styles, no NativeWind on this screen
- Icons: `lucide-react-native`, 14–20px, `gray900`/`gray400`
- Nested `ThemedText` does NOT inherit font size — always set explicit `fontSize` on inner text styles
- Every touchable has `accessibilityRole` + `accessibilityLabel` (+ `accessibilityState.selected` for selectors)
- No hardcoded size lists — sizes/measurements come from `Product.sizes[].productMeasurements` only
