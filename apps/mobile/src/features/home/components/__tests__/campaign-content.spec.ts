import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Campaign content is CONTENT, not code.
 *
 * `CampaignCountdownBanner` used to fall back to an invented campaign —
 * `Shop Festival Dhamaka`, hardcoded dates, an Unsplash hero photo — when the
 * API had nothing scheduled. A backend outage then rendered as a healthy
 * storefront running a sale that did not exist, and shoppers clicked through to
 * a campaign that was never configured.
 *
 * The contract these tests pin:
 *  - the banner renders WHAT THE API RETURNS (`campaign.title`, `campaign.tagline`),
 *  - it renders NOTHING when the API returns nothing, and
 *  - no campaign name is written into the source at all.
 *
 * The mobile test environment is `node` (no component rendering), so the render
 * path is pinned by source and the strings are checked by assertion.
 */

const BANNER_SRC = readFileSync(resolve(__dirname, '../campaign-countdown-banner.tsx'), 'utf8');
const RAIL_SRC = readFileSync(resolve(__dirname, '../super-deals-rail.tsx'), 'utf8');

const BANNER_CODE = BANNER_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('campaign countdown banner — no invented campaign content', () => {
  it('has no hardcoded campaign name anywhere in the source', () => {
    expect(BANNER_SRC).not.toMatch(/dhamaka/i);
  });

  it('declares no fallback campaign of its own', () => {
    expect(BANNER_CODE).not.toMatch(/FALLBACK_CAMPAIGN\s*[:=]/);
  });

  it('renders the title the API returned, not a local one', () => {
    expect(BANNER_CODE).toContain('{campaign.title}');
  });

  it('renders the tagline only when the API supplied one', () => {
    expect(BANNER_CODE).toMatch(/campaign\.tagline\s*\?/);
    expect(BANNER_CODE).toContain('{campaign.tagline}');
  });

  it('renders nothing when there is no active campaign', () => {
    expect(BANNER_CODE).toMatch(/!activeCampaign[\s\S]{0,120}return null/);
  });
});

describe('super deals rail — no hardcoded colours or copy', () => {
  it('does not hardcode the tag text colour', () => {
    expect(RAIL_SRC).not.toMatch(/color:\s*'#FFFFFF'/i);
    expect(RAIL_SRC).toContain('color: Palette.white');
  });
});
