// Adapter: organizations row -> the flat shape the PDF builders expect.
//
// BUG THIS FIXES (2026-07-12): the PDF builders read `org.address`, but the
// organizations table has no `address` column - it stores address_line1,
// address_line2, suburb, state and postcode separately.
//
// The portal quote PDF route was selecting `address` from organizations, so
// PostgREST returned an error, the route logged it and carried on with a null
// org, and every quote PDF a customer downloaded rendered with NO business
// name, NO ABN and NO contact details. On an Australian tax document the
// missing ABN is not cosmetic.
//
// Select ORG_PDF_COLUMNS and pass the row through orgToBusinessInfo().

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The columns that actually exist and that the PDFs need. */
export const ORG_PDF_COLUMNS =
  'id, name, abn, email, phone, address_line1, address_line2, suburb, state, postcode, logo_url';

export interface OrgPDFBusinessInfo {
  name: string;
  abn: string;
  email: string;
  phone: string;
  address: string;
  logo_url?: string | null;
}

/** Compose the separate address columns into one line for the PDF header. */
export function composeOrgAddress(org: any): string {
  if (!org) return '';
  return [
    org.address_line1,
    org.address_line2,
    [org.suburb, org.state, org.postcode].filter(Boolean).join(' '),
  ]
    .filter((part) => part && String(part).trim().length > 0)
    .join(', ');
}

export function orgToBusinessInfo(org: any): OrgPDFBusinessInfo | null {
  if (!org) return null;
  return {
    name: org.name || '',
    abn: org.abn || '',
    email: org.email || '',
    phone: org.phone || '',
    address: composeOrgAddress(org),
    logo_url: org.logo_url ?? null,
  };
}
