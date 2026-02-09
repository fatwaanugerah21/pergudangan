/**
 * Get start of today and end of day 7 days from today in a given timezone (GMT offset).
 * @param offsetHours - Timezone offset in hours from UTC (e.g. 8 for GMT+8). Default 8.
 * @returns { startOfToday, endOfWeek } as UTC Date instances for use in DB queries.
 */
export function getTodayAndWeekEndInTimezone(offsetHours: number = 8): {
  startOfToday: Date;
  endOfWeek: Date;
} {
  const now = new Date();
  const offsetMs = offsetHours * 60 * 60 * 1000;
  // "Local" date in the user's zone: UTC time + offset
  const localMs = now.getTime() + offsetMs;
  const localDate = new Date(localMs);
  const y = localDate.getUTCFullYear();
  const m = localDate.getUTCMonth();
  const d = localDate.getUTCDate();

  // Start of today in user TZ: (y, m, d) 00:00:00.000 in user TZ -> UTC
  const startOfToday = new Date(Date.UTC(y, m, d) - offsetMs);
  // End of day 7 days later: (y, m, d+7) 23:59:59.999 in user TZ -> UTC
  const endOfWeek = new Date(Date.UTC(y, m, d + 7, 23, 59, 59, 999) - offsetMs);

  return { startOfToday, endOfWeek };
}

/**
 * Parse timezone offset from request. Prefer X-Timezone-Offset (hours, e.g. 8 for GMT+8).
 * @param req - Express request (optional, for future header use)
 * @returns Offset in hours from UTC. Default 8 (GMT+8).
 */
export function getTimezoneOffsetFromRequest(req?: { headers?: { [key: string]: string | string[] | undefined } }): number {
  const defaultOffset = 8;
  if (!req?.headers) return defaultOffset;
  const raw = req.headers['x-timezone-offset'];
  if (raw == null) return defaultOffset;
  const parsed = typeof raw === 'string' ? parseInt(raw, 10) : parseInt(raw[0], 10);
  if (!Number.isFinite(parsed)) return defaultOffset;
  // Clamp to reasonable range (-12 to 14)
  return Math.max(-12, Math.min(14, parsed));
}
