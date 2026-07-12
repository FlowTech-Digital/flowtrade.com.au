-- invoice_events: audit trail for invoice sends / portal views / payments.
-- Mirrors public.quote_events exactly.
--
-- The invoice send route (src/app/api/invoices/[id]/send/route.ts) has been
-- inserting into this table since it was written. The table never existed, and
-- the insert error was never checked, so every invoice send silently failed to
-- log. quote_events works fine, which is why nobody noticed.
--
-- Applied to the production project (cxrjdasltwlpevgnoemz) on 2026-07-12.
-- Additive only: no existing table or data is modified. Idempotent.

CREATE TABLE IF NOT EXISTS public.invoice_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type  varchar NOT NULL,
  event_data  jsonb,
  ip_address  varchar,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_id ON public.invoice_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_event_type ON public.invoice_events(event_type);
CREATE INDEX IF NOT EXISTS idx_invoice_events_created_at ON public.invoice_events(created_at DESC);

ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

-- RLS mirrors quote_events (events_insert_org / events_select_org):
-- scope every row to the caller's organisation via the parent invoice.
DROP POLICY IF EXISTS invoice_events_insert_org ON public.invoice_events;
CREATE POLICY invoice_events_insert_org ON public.invoice_events
  FOR INSERT
  WITH CHECK (
    invoice_id IN (SELECT invoices.id FROM public.invoices WHERE invoices.org_id = get_user_org_id())
  );

DROP POLICY IF EXISTS invoice_events_select_org ON public.invoice_events;
CREATE POLICY invoice_events_select_org ON public.invoice_events
  FOR SELECT
  USING (
    invoice_id IN (SELECT invoices.id FROM public.invoices WHERE invoices.org_id = get_user_org_id())
  );
