// Single source of truth for "who is a selectable, verified Compliance Officer".
// Used by:
//   - server.ts            -> GET /api/accountants/list (server-side, authoritative)
//   - ClientDashboardModeModal.tsx -> local/offline fallback list
//
// IMPORTANT: This file must stay framework-free (no React, no DOM, no Node-only
// APIs) so it can be imported unchanged from both the Express server (via tsx /
// esbuild) and the Vite-bundled browser client. If the two ever diverge again,
// the server and the offline fallback will disagree about who's selectable.

export const COMPLIANCE_OFFICER_ROLES = [
  'Compliance Officer',
  'Compliance Specialist',
  'Compliance CPA',
  'Senior Tax Accountant',
  'Tax Associate',
] as const;

// account types / roles that must NEVER be selectable as a "compliance officer
// to sync with", no matter what other fields on the record say.
const EXCLUDED_ACCOUNT_TYPES = new Set(['business_owner', 'client']);
const EXCLUDED_ROLES = new Set(['client', 'business owner']);

export interface MinimalUserRecord {
  accountType?: string | null;
  role?: string | null;
  /**
   * Whether this account has completed compliance-officer verification
   * (e.g. CPA license / firm registration check). `false` always excludes.
   * `undefined`/`null` is treated as verified for backward compatibility with
   * records created before this field existed. Tighten to `=== true` once a
   * real verification/approval workflow exists.
   */
  verified?: boolean | null;
}

export function isEligibleComplianceOfficer(u: MinimalUserRecord | null | undefined): boolean {
  if (!u) return false;

  const accountType = (u.accountType || '').trim().toLowerCase();
  const role = (u.role || '').trim();
  const roleLower = role.toLowerCase();

  // Hard exclusions first: business owners and clients are never selectable,
  // regardless of anything else on the record (defense in depth against a
  // record that's mislabeled or has a stray role string).
  if (EXCLUDED_ACCOUNT_TYPES.has(accountType)) return false;
  if (EXCLUDED_ROLES.has(roleLower)) return false;

  // Must be explicitly recognized as an accountant / compliance role.
  const isRecognizedRole =
    accountType === 'accountant' ||
    (COMPLIANCE_OFFICER_ROLES as readonly string[]).includes(role);
  if (!isRecognizedRole) return false;

  // Verification gate.
  if (u.verified === false) return false;

  return true;
}