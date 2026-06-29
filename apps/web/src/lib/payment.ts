// Coach payment details for the manual accountability ledger.
// Update these if your Venmo/Zelle ever change.
export const VENMO_URL = 'https://venmo.com/u/Poojan__p';
export const VENMO_HANDLE = '@Poojan__p';
export const ZELLE_PHONE = '443-676-0696';

/** Cents -> "$10" / "$12.50" */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}
