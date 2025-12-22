export const ADMIN_KEY_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Formats arbitrary input into AAAA-BBBB-CCCC style.
 * - Keeps only alphanumeric
 * - Uppercases
 * - Inserts hyphens after 4 and 8 chars
 */
export function formatAdminKey(input: string): string {
  const value = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let formatted = '';
  for (let i = 0; i < value.length && i < 12; i++) {
    if (i > 0 && i % 4 === 0) formatted += '-';
    formatted += value[i];
  }
  return formatted;
}

export function isValidAdminKeyFormat(input: string): boolean {
  return ADMIN_KEY_REGEX.test(input.trim().toUpperCase());
}
