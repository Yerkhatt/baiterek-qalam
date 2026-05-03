/**
 * Normalizes `serviceId` from URLs or user paste where UTF-8 may appear percent-encoded.
 */
export function decodeServiceIdParam(raw: string): string {
  let prev = raw.trim();
  for (let i = 0; i < 8; i += 1) {
    if (!/%(?:[0-9A-Fa-f]{2})/u.test(prev)) {
      return prev;
    }
    try {
      const next = decodeURIComponent(prev);
      if (next === prev) {
        return prev;
      }
      prev = next;
    } catch {
      return prev;
    }
  }
  return prev;
}
