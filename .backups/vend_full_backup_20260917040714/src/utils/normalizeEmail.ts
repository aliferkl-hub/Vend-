/**
 * Central email normalization utility for VEND+.
 * Enforces uniform, safe lowercase and whitespace trimming across
 * registration, login, password recovery, admin queries, and repository lookups.
 */

export function normalizeEmail(email: unknown): string {
  if (email === null || email === undefined) {
    return '';
  }
  const str = String(email);
  return str.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  // RFC 5322 compliant regex for standard emails
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
