import type { ComboBundleData } from '../types';

export const DEMO_COMBOS: ComboBundleData[] = [
  {
    id: 'combo_travel_1',
    title: 'Australia Winter Survival Kit',
    slug: 'australia-winter-survival-kit',
    subtitle: 'Must-have thermal layers & puffer jacket for Aussie students',
    discountType: 'FIXED_AMOUNT',
    discountValue: 2500,
    isFirstParty: true,
    tag: 'abroad-travel',
    bannerImage:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop',
    items: [{ id: '1', productId: 'p1', defaultQuantity: 1 }],
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'combo_travel_2',
    title: 'UK Heavy Warmth Student Pack',
    slug: 'uk-heavy-warmth-student-pack',
    subtitle: '3-piece cold weather bundle (Jacket, Boots, Thermal)',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    isFirstParty: true,
    tag: 'abroad-travel',
    bannerImage:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop',
    items: [{ id: '2', productId: 'p2', defaultQuantity: 1 }],
    createdAt: '2026-08-02T00:00:00Z',
  },
  {
    id: 'combo_festive_1',
    title: 'Dashain Festive Outfit Bundle',
    slug: 'dashain-festive-outfit-bundle',
    subtitle: 'Traditional linen shirt + slim fit denim combo set',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    isFirstParty: true,
    tag: 'festive',
    bannerImage:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop',
    items: [{ id: '3', productId: 'p3', defaultQuantity: 1 }],
    createdAt: '2026-08-03T00:00:00Z',
  },
];
