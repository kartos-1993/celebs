import type { NotificationSeverity, NotificationType } from '@celebs/shared-types';

/**
 * Nepal Time (NPT) is UTC + 5:45 (345 minutes offset).
 * Quiet hours are between 22:00 (10 PM) and 08:00 (8 AM) NPT.
 */
const NPT_OFFSET_MINUTES = 345;
const QUIET_HOURS_START_HOUR = 22; // 10 PM NPT
const QUIET_HOURS_END_HOUR = 8; // 8 AM NPT

export interface QuietHoursResult {
  inQuietHours: boolean;
  delayMs: number;
}

export function calculateQuietHoursDelay(date: Date = new Date()): QuietHoursResult {
  const utcMillis = date.getTime();
  const nptMillis = utcMillis + NPT_OFFSET_MINUTES * 60 * 1000;
  const nptDate = new Date(nptMillis);

  const nptHours = nptDate.getUTCHours();
  const nptMinutes = nptDate.getUTCMinutes();
  const nptSeconds = nptDate.getUTCSeconds();

  const inQuietHours = nptHours >= QUIET_HOURS_START_HOUR || nptHours < QUIET_HOURS_END_HOUR;

  if (!inQuietHours) {
    return { inQuietHours: false, delayMs: 0 };
  }

  // Calculate target wake-up time: next 08:00 AM NPT
  let hoursUntil8Am: number;
  if (nptHours >= QUIET_HOURS_START_HOUR) {
    hoursUntil8Am = 24 - nptHours + QUIET_HOURS_END_HOUR;
  } else {
    hoursUntil8Am = QUIET_HOURS_END_HOUR - nptHours;
  }

  const delayMs = hoursUntil8Am * 3600 * 1000 - nptMinutes * 60 * 1000 - nptSeconds * 1000;

  return {
    inQuietHours: true,
    delayMs: Math.max(0, delayMs),
  };
}

export function shouldApplyQuietHours(
  type: NotificationType,
  severity: NotificationSeverity,
): boolean {
  if (severity === 'CRITICAL') {
    return false;
  }

  const transactionalTypes: NotificationType[] = [
    'ORDER_STATUS',
    'PAYMENT',
    'VENDOR_ORDER',
    'SYSTEM',
  ];
  if (transactionalTypes.includes(type)) {
    return false;
  }

  return true;
}
