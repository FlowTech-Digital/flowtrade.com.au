-- job_line_items: the editable middle of the quote -> job -> invoice chain.
--
-- WHY: line items were being destroyed at the quote->job boundary.
-- jobs/from-quote flattened quote line items into a TEXT string (.join('\n')
-- into job_notes), and invoices/from-job never wrote invoice_line_items at all.
-- Result: invoice_line_items was empty across every invoice, and invoice PDFs
-- rendered an empty table.
--
-- DESIGN (VIN, 2026-07-12): the job is the editable stage. Quote line items are
-- copied here on conversion; the tradie edits them on the job (variations, extra
-- materials, actual hours); the invoice is then built from these lines.
--
-- Applied to production (cxrjdasltwlpevgnoemz) on 2026-07-12.
-- Mirrors public.quote_line_items. Additive only. Idempotent.

CREATE TABLE IF NOT EXISTS public.job_line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_order      integer,
  item_type       varchar,
  category        varchar,
  description     text NOT NULL,
  detailed_notes  text,
  quantity        numeric NOT NULL DEFAULT 1,
  unit            varchar,
  unit_cost       numeric DEFAULT 0,
  unit_price      numeric NOT NULL DEFAULT 0,
  markup_percent  numeric,
  line_total      numeric NOT NULL DEFAULT 0,
  line_cost       numeric,
  supplier_name   varchar,
  supplier_sku    varchar,
  is_taxable      boolean DEFAULT true,
  is_optional     boolean DEFAULT false,
  -- provenance: which quote line this came from (null = added at the job stage)
  source_quote_line_item_id uuid REFERENCES public.quote_line_items(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_line_items_job_id ON public.job_line_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_line_items_order ON public.job_line_items(job_id, item_order);

ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;

-- RLS mirrors quote_line_items: scope every row to the caller's organisation
-- via the parent job.
DROP POLICY IF EXISTS job_line_items_select_org ON public.job_line_items;
CREATE POLICY job_line_items_select_org ON public.job_line_items
  FOR SELECT USING (
    job_id IN (SELECT jobs.id FROM public.jobs WHERE jobs.org_id = get_user_org_id())
  );

DROP POLICY IF EXISTS job_line_items_insert_org ON public.job_line_items;
CREATE POLICY job_line_items_insert_org ON public.job_line_items
  FOR INSERT WITH CHECK (
    job_id IN (SELECT jobs.id FROM public.jobs WHERE jobs.org_id = get_user_org_id())
  );

DROP POLICY IF EXISTS job_line_items_update_org ON public.job_line_items;
CREATE POLICY job_line_items_update_org ON public.job_line_items
  FOR UPDATE USING (
    job_id IN (SELECT jobs.id FROM public.jobs WHERE jobs.org_id = get_user_org_id())
  );

DROP POLICY IF EXISTS job_line_items_delete_org ON public.job_line_items;
CREATE POLICY job_line_items_delete_org ON public.job_line_items
  FOR DELETE USING (
    job_id IN (SELECT jobs.id FROM public.jobs WHERE jobs.org_id = get_user_org_id())
  );
