import type { CampaignData, TimeRemaining } from '../types';

import { Palette } from '@/constants/theme';

export function calculateTimeRemaining(targetDateIso: string): TimeRemaining {
  const diff = new Date(targetDateIso).getTime() - new Date().getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

export const FALLBACK_CAMPAIGN: CampaignData = {
  id: 'camp_dashain',
  title: 'Dashain Dhamaka 2026',
  slug: 'dashain-dhamaka-2026',
  campaignType: 'FESTIVAL',
  tagline: "Nepal's Biggest Festive Shopping Season — Flat 40% Off",
  themeColor: Palette.danger,
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-10-15T23:59:59Z',
  isActive: true,
  bannerImage:
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop',
};
