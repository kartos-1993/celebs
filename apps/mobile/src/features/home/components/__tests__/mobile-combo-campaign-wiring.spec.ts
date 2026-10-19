import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The mobile test environment is `node` (no component rendering), so the
 * cross-file wiring that makes combo checkout and campaign navigation reachable
 * is pinned at the source level, the same way `campaign-content.spec.ts` pins
 * the banner render contract.
 */

const src = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

const CART_API = src('../../../../features/cart/api.ts');
const HOME_SCREEN = src('../../../../app/(tabs)/index.tsx');
const BANNER = src('../campaign-countdown-banner.tsx');
const WIDGET_REGISTRY = src('../../../sdui/components/widget-registry.tsx');
const LAYOUT = src('../../../../app/_layout.tsx');
const CAMPAIGN_SCREEN = src('../../../../app/campaign/[slug].tsx');

describe('combo cart wiring', () => {
  it('posts combo adds to the existing server endpoint', () => {
    expect(CART_API).toContain("'/cart/combos'");
  });

  it('passes the modal callback from the home screen', () => {
    expect(HOME_SCREEN).toContain('onAddToCart={handleAddComboToCart}');
    expect(HOME_SCREEN).toContain('buildComboCartInput');
  });
});

describe('campaign destination wiring', () => {
  it('gives the banner CTA an actual press target', () => {
    expect(BANNER).toMatch(/onPress\?:/);
    expect(BANNER).toMatch(/onPress=\{\(\) => onPress\?\.\(campaign\)\}/);
  });

  it('forwards the campaign handler through the SDUI registry', () => {
    expect(WIDGET_REGISTRY).toContain('onPressCampaign');
    expect(WIDGET_REGISTRY).toContain('onPress={handlers?.onPressCampaign}');
  });

  it('registers the campaign route and navigates to it from home', () => {
    expect(LAYOUT).toContain('name="campaign/[slug]"');
    expect(HOME_SCREEN).toContain("pathname: '/campaign/[slug]'");
  });

  it('filters the campaign screen products by the route slug', () => {
    expect(CAMPAIGN_SCREEN).toContain('useCampaign');
    expect(CAMPAIGN_SCREEN).toMatch(/campaign:\s*campaignSlug/);
  });
});
