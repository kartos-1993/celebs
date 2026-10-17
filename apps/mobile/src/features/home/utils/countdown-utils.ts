import type { TimeRemaining } from '../types';

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

// NOTE: this module used to export a `FALLBACK_CAMPAIGN` — a fully invented
// "Dashain Dhamaka 2026" campaign with hardcoded title/slug/dates, a
// `Palette.danger` theme and an Unsplash hero photo. It was rendered whenever
// the API returned no active campaign, so a backend outage (or a genuinely
// quiet season) looked like a healthy storefront running a sale that did not
// exist. Callers now render a real empty state instead.
