import { useEffect, useMemo, useState } from 'react';

import type { TimeRemaining } from '../types';
import { calculateTimeRemaining } from '../utils/countdown-utils';

/**
 * Live countdown for a campaign end date.
 *
 * One implementation for the home banner and the campaign destination screen.
 * A ticking clock is the state; the remaining time is derived from it, so a new
 * end date re-renders immediately while the interval is torn down on unmount or
 * date change. An absent date yields `null` rather than a zeroed countdown.
 */
export function useCountdown(endDate: string): TimeRemaining | null {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!endDate) return;

    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return useMemo(() => (endDate ? calculateTimeRemaining(endDate, nowMs) : null), [endDate, nowMs]);
}
