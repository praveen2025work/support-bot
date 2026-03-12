export type DatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'last_week'
  | 'last_month'
  | 'last_quarter';

const DATE_PRESETS: ReadonlySet<string> = new Set([
  'today',
  'this_week',
  'this_month',
  'this_quarter',
  'last_week',
  'last_month',
  'last_quarter',
]);

export interface DateRange {
  start: string;
  end: string;
}

export function isDatePreset(value: string): value is DatePreset {
  return DATE_PRESETS.has(value);
}

export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return format
    .replace('YYYY', y)
    .replace('MM', m)
    .replace('DD', d);
}

export function resolveDateRange(
  preset: DatePreset,
  format: string = 'YYYY-MM-DD',
  referenceDate?: Date
): DateRange {
  const ref = referenceDate ?? new Date();
  // Work in local time
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  let start: Date;
  let end: Date;

  switch (preset) {
    case 'today':
      start = end = today;
      break;

    case 'this_week': {
      // Monday = start of week (ISO)
      const dow = today.getDay(); // 0=Sun, 1=Mon...
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      start = new Date(today);
      start.setDate(today.getDate() - mondayOffset);
      end = today;
      break;
    }

    case 'last_week': {
      const dow = today.getDay();
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - mondayOffset);
      end = new Date(thisMonday);
      end.setDate(thisMonday.getDate() - 1); // last Sunday
      start = new Date(end);
      start.setDate(end.getDate() - 6); // last Monday
      break;
    }

    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
      break;

    case 'last_month': {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
      break;
    }

    case 'this_quarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
      end = today;
      break;
    }

    case 'last_quarter': {
      const currentQStart = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), currentQStart - 3, 1);
      end = new Date(today.getFullYear(), currentQStart, 0); // last day of prev quarter
      break;
    }

    default:
      start = end = today;
  }

  return {
    start: formatDate(start, format),
    end: formatDate(end, format),
  };
}
