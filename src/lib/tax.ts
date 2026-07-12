// Organisation tax settings.
//
// FlowTrade was hardcoded to Australian GST at 10%: the rate appeared as a bare
// 0.1 / 10 in six places, and org_settings.default_gst_rate existed but nothing
// read it. An org outside Australia could not turn tax off, change the rate, or
// call it anything other than GST.
//
// MODEL: org-level on/off + rate + label. Prices are tax-EXCLUSIVE - tax is
// added on top of the subtotal, which is how the app already behaved. Per-line
// exemptions are deliberately not supported yet (quote_line_items.is_taxable is
// true on every row); tax applies to the whole subtotal.

export type TaxSettings = {
  /** false = no tax at all: no tax line on quotes or invoices */
  enabled: boolean
  /** PERCENT, not a fraction. 10 = 10%. */
  rate: number
  /** What it is called on documents: GST, VAT, Sales Tax... */
  label: string
}

/** Australian default - what every existing org is on. */
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  rate: 10,
  label: 'GST',
}

/** The tax rate to STORE on a quote/invoice: 0 when tax is switched off. */
export function effectiveRate(settings: TaxSettings): number {
  return settings.enabled ? Number(settings.rate) || 0 : 0
}

/**
 * Tax on a subtotal, rounded to cents.
 * Rounding matters: float sums otherwise leak fractions of a cent into a
 * financial document.
 */
export function computeTax(subtotal: number, settings: TaxSettings): number {
  const rate = effectiveRate(settings)
  if (!rate) return 0
  return Math.round(subtotal * (rate / 100) * 100) / 100
}

/** "GST (10%)" / "VAT (20%)" - what the document should say. */
export function taxLineLabel(settings: TaxSettings): string {
  return `${settings.label} (${effectiveRate(settings)}%)`
}

/** Map an org_settings row onto TaxSettings, falling back to the AU default. */
export function taxSettingsFromRow(row: {
  tax_enabled?: boolean | null
  default_gst_rate?: number | string | null
  tax_label?: string | null
} | null | undefined): TaxSettings {
  if (!row) return DEFAULT_TAX_SETTINGS
  return {
    enabled: row.tax_enabled ?? true,
    rate: Number(row.default_gst_rate ?? 10),
    label: row.tax_label || 'GST',
  }
}

/**
 * Rebuild the tax settings of an EXISTING document from what was stored on it.
 * Quotes and invoices both snapshot tax_rate, so a historical document keeps the
 * rate it was issued under even if the org later changes its settings.
 */
export function taxSettingsFromDocument(
  doc: { tax_rate?: number | string | null },
  orgSettings: TaxSettings
): TaxSettings {
  const rate = doc.tax_rate === null || doc.tax_rate === undefined ? null : Number(doc.tax_rate)
  if (rate === null) return orgSettings
  return {
    enabled: rate > 0,
    rate,
    label: orgSettings.label,
  }
}
