-- Make tax configurable per organisation, so FlowTrade is not hardcoded to
-- Australian GST at 10%.
--
-- WHY: org_settings.default_gst_rate already existed (10.00 for every org) but
-- NOTHING in the app read it - the rate was hardcoded 0.1 / 10 in six places
-- (quotes new/edit, invoices new/edit, invoices/route.ts, invoices/from-job),
-- and the Settings page did not expose tax at all. An org outside Australia had
-- no way to turn tax off, change the rate, or call it anything but GST.
--
-- MODEL (VIN, 2026-07-12): org-level on/off + rate + label. Prices remain
-- tax-EXCLUSIVE (tax added on top), as the app already behaves. Per-line
-- exemptions are deliberately NOT introduced yet - is_taxable stays true.
--
-- Applied to production (cxrjdasltwlpevgnoemz) on 2026-07-12.
-- Additive only. Idempotent.

-- 1. Tax settings on the org
ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS tax_label text NOT NULL DEFAULT 'GST';

COMMENT ON COLUMN public.org_settings.tax_enabled IS
  'Whether tax is applied at all. False = no tax line on quotes/invoices (e.g. non-registered, or a jurisdiction with no such tax).';
COMMENT ON COLUMN public.org_settings.tax_label IS
  'What the tax is called on documents: GST (AU/NZ), VAT (UK/EU), Sales Tax, etc.';
COMMENT ON COLUMN public.org_settings.default_gst_rate IS
  'Tax rate as a PERCENT (10 = 10%). Named default_gst_rate for history; it is the generic tax rate.';

-- 2. Invoices should snapshot the rate the way quotes already do, instead of the
--    PDF reverse-engineering it from gst_amount / subtotal.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS tax_rate numeric;

-- Backfill existing invoices from what was actually charged (all were 10%).
UPDATE public.invoices
SET tax_rate = CASE
    WHEN subtotal > 0 THEN ROUND((gst_amount / subtotal) * 100, 2)
    ELSE 10
  END
WHERE tax_rate IS NULL;

-- 3. One org had no org_settings row at all (the creation trigger post-dates it),
--    so it would have had no tax settings to read. Give every org a row.
INSERT INTO public.org_settings (org_id)
SELECT o.id
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.org_settings s WHERE s.org_id = o.id);
