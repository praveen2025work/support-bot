/**
 * Identity payload returned by the AD/SSO userinfo endpoint.
 *
 * Shape mirrors what the Barclays-style AD endpoint returns —
 * `samAccountName` and `userName` are the same value (the AD account
 * name); pick whichever reads better at the call site.
 *
 * Optional fields like `department`, `location`, `role` are
 * application-side enrichments — they're not on the AD response but
 * may be populated by the admin lookup in users.json.
 */
export interface UserInfo {
  /** AD account name, e.g. "kumarp15". Same value as `userName`. */
  samAccountName: string;
  /** AD account name, kept as a separate field for legacy callers. */
  userName: string;
  /** Human-readable description, e.g. "Nandyala, Praveen Kumar: IT (NYK)". */
  description?: string;
  /** Display name, e.g. "Nandyala, Praveen Kumar : RFT COO (NYK)". */
  displayName: string;
  /** LDAP DN, e.g. "CN=Nandyala\, Praveen Kumar: IT (NYK),OU=Users,..." */
  distinguishedName?: string;
  /** Email address. AD field is `emailAddress` (not `email`). */
  emailAddress: string;
  /** Internal employee identifier. */
  employeeId: string;
  /** Full name as logged in, e.g. "Nandyala, Praveen Kumar: IT (NYK)". */
  name?: string;
  /** First name. */
  givenName: string;
  /** Middle name; AD returns null when absent. */
  middleName?: string | null;
  /** Surname / last name. */
  surname: string;
  /** AD domain (may be null when the endpoint runs inside the domain). */
  domain?: string | null;
  // ── Application-side enrichments (not on AD response) ───────────────
  department?: string;
  location?: string;
  role?: string;
}
