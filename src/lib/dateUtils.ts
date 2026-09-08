import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { db, Transaction } from '@/lib/db';

/**
 * Returns YYYY-MM-DD in local time
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns HH:mm strictly in 24-hour format in local time
 */
export function getLocal24TimeString(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns HH:mm:ss strictly in 24-hour format in local time
 */
export function getLocal24TimeWithSeconds(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Builds a standardized local transaction date-time string: YYYY-MM-DDTHH:mm:00
 * Avoids phantom UTC timezone conversions and fake ".000Z" suffixes.
 */
export function buildTransactionDateTime(dateStr: string, timeStr?: string): string {
  const safeDate = dateStr && dateStr.trim().length >= 10 ? dateStr.trim().slice(0, 10) : getLocalDateString();
  
  let safeTime = timeStr?.trim();
  if (!safeTime || !/^\d{1,2}:\d{2}/.test(safeTime)) {
    safeTime = getLocal24TimeString();
  } else {
    // Ensure two digits for hour and minute
    const parts = safeTime.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] || '00').slice(0, 2).padStart(2, '0');
    safeTime = `${hh}:${mm}`;
  }

  return `${safeDate}T${safeTime}:00`;
}

/**
 * Formats any date-time string or Date into 24-hour format: "HH:mm" (00:00 - 23:59).
 * - If string is date-only (length <= 10 or YYYY-MM-DD), it does NOT have a time -> returns fallback
 * - Handles both local ISO strings and UTC ISO strings correctly without jumping by 7/8 hours.
 */
export function format24HourTime(
  dateStr?: string | Date | null,
  fallbackCreatedAt?: string | null,
  fallback: string = ''
): string {
  if (!dateStr) {
    if (fallbackCreatedAt) {
      return format24HourTime(fallbackCreatedAt, null, fallback);
    }
    return fallback;
  }

  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return fallback;
    return getLocal24TimeString(dateStr);
  }

  const trimmed = dateStr.trim();

  // Date-only string (e.g. "2026-09-08") -> does not carry a specific time
  if (trimmed.length <= 10 && !trimmed.includes('T') && !trimmed.includes(' ')) {
    if (fallbackCreatedAt && fallbackCreatedAt.length > 10) {
      return format24HourTime(fallbackCreatedAt, null, fallback);
    }
    return fallback;
  }

  const tIndex = trimmed.indexOf('T') !== -1 ? trimmed.indexOf('T') : trimmed.indexOf(' ');
  if (tIndex !== -1) {
    const timePart = trimmed.slice(tIndex + 1);
    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
    
    // If it has trailing Z or timezone offset
    if (trimmed.endsWith('Z') || trimmed.includes('+') || (trimmed.slice(tIndex).includes('-') && trimmed.length > 19)) {
      try {
        const parsed = parseISO(trimmed);
        if (isValid(parsed)) {
          return format(parsed, 'HH:mm');
        }
      } catch {}
    }

    if (timeMatch) {
      const hh = timeMatch[1].padStart(2, '0');
      const mm = timeMatch[2].padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return format(d, 'HH:mm');
    }
  } catch {}

  return fallback;
}

/**
 * Robust parser for Transaction date field.
 * Returns both date and 24-hour time cleanly.
 */
export function parseTransactionDate(
  txOrDateStr: string | Transaction,
  fallbackCreatedAt?: string
) {
  const rawStr = typeof txOrDateStr === 'string' 
    ? txOrDateStr 
    : txOrDateStr.transaction_date;
  const createdAt = typeof txOrDateStr === 'string' 
    ? fallbackCreatedAt 
    : (txOrDateStr.created_at || fallbackCreatedAt);

  const trimmed = (rawStr || '').trim();
  let datePart = getLocalDateString();
  let timePart = '';
  let hasTime = false;
  let fullDate = new Date();

  if (trimmed.length >= 10) {
    datePart = trimmed.slice(0, 10);
  }

  const formattedTime = format24HourTime(trimmed, createdAt, '');
  if (formattedTime) {
    timePart = formattedTime;
    hasTime = true;
  }

  // Construct local Date safely without timezone conversion bugs
  if (hasTime) {
    const [h, m] = timePart.split(':').map(Number);
    const [y, mon, d] = datePart.split('-').map(Number);
    fullDate = new Date(y, (mon || 1) - 1, d || 1, h || 0, m || 0, 0);
  } else {
    const [y, mon, d] = datePart.split('-').map(Number);
    fullDate = new Date(y, (mon || 1) - 1, d || 1, 0, 0, 0);
  }

  const displayDate = isValid(fullDate) 
    ? format(fullDate, 'd MMMM yyyy', { locale: idLocale })
    : datePart;

  const displayTime = timePart || '24 Jam';
  const displayDateTime = hasTime 
    ? `${isValid(fullDate) ? format(fullDate, 'd MMM yyyy', { locale: idLocale }) : datePart}, ${timePart}`
    : (isValid(fullDate) ? format(fullDate, 'd MMM yyyy', { locale: idLocale }) : datePart);

  return {
    date: datePart,
    time: timePart,
    hasTime,
    fullDate,
    displayDate,
    displayTime,
    displayDateTime,
  };
}

/**
 * Returns humanized Indonesian date header (e.g. "Hari Ini • 8 September 2026")
 */
export function getDateGroupLabel(dateStr: string): string {
  try {
    const { date, fullDate } = parseTransactionDate(dateStr);
    const todayStr = getLocalDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (date === todayStr) {
      return `Hari Ini • ${format(fullDate, 'd MMMM yyyy', { locale: idLocale })}`;
    }
    if (date === yesterdayStr) {
      return `Kemarin • ${format(fullDate, 'd MMMM yyyy', { locale: idLocale })}`;
    }
    return format(fullDate, 'EEEE, d MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
}

/**
 * One-time lightweight database migration to sanitize and repair inconsistent dates
 * in Dexie IndexedDB (removes fake .000Z suffixes, standardizes to 24-hour local ISO).
 */
export async function migrateInconsistentTransactionDates(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  try {
    const txs = await db.transactions.toArray();
    let updatedCount = 0;

    for (const tx of txs) {
      const raw = tx.transaction_date || '';
      let needsUpdate = false;
      let newDateStr = raw;

      // Fix trailing fake .000Z or unstandardized strings
      if (raw.endsWith('.000Z') || (raw.includes('T') && raw.endsWith('Z'))) {
        const datePart = raw.slice(0, 10);
        const timePart = format24HourTime(raw, tx.created_at, '12:00');
        newDateStr = `${datePart}T${timePart}:00`;
        needsUpdate = true;
      }

      if (needsUpdate && newDateStr !== raw) {
        await db.transactions.update(tx.id, { transaction_date: newDateStr });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[FinTrack] Migrated ${updatedCount} transactions to standard 24h format.`);
    }

    return updatedCount;
  } catch (err) {
    console.error('[FinTrack] Date migration error:', err);
    return 0;
  }
}
