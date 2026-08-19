export const toTitleCase = (str?: string | null) =>
  str
    ? str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : ''

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getOrdinal = (n: number): string => {
    if (n >= 11 && n <= 13) return `${n}th`;

    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  return `${getOrdinal(day)} ${months[month - 1]} ${year}`;
}

// ─── Timezone-aware date/time helpers (online classes) ────────────────────────
// The event's own `timezone` is always used for display, so what a student
// or admin sees in the LMS matches the Google Calendar event time exactly —
// regardless of which timezone the viewer's own device happens to be in.

/** ISO instant -> "15 August 2026" in the given IANA timezone. */
export function formatDateInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** ISO instant -> "10:00 AM" in the given IANA timezone. */
export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/** Splits an ISO instant into the "YYYY-MM-DD" + "HH:mm" (24h) wall-clock values it represents in the given timezone — for prefilling <input type="date"/"time"> on an edit form. */
export function isoToZonedParts(iso: string, timeZone: string): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts: Record<string, string> = {}
  fmt.formatToParts(new Date(iso)).forEach((p) => {
    if (p.type !== 'literal') parts[p.type] = p.value
  })
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}