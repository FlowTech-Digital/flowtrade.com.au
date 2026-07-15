'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react'

export type JobLineItem = {
  id: string
  job_id: string
  item_order: number | null
  item_type: string | null
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  line_total: number
  is_taxable: boolean | null
  is_optional: boolean | null
  source_quote_line_item_id?: string | null
  /** client-only: true for rows that have not been saved yet */
  isNew?: boolean
}

const GST_RATE = 0.1

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function makeEmptyRow(jobId: string, order: number): JobLineItem {
  return {
    id: `new-${crypto.randomUUID()}`,
    job_id: jobId,
    item_order: order,
    item_type: 'labor',
    description: '',
    quantity: 1,
    unit: 'ea',
    unit_price: 0,
    line_total: 0,
    is_taxable: true,
    is_optional: false,
    isNew: true,
  }
}

export default function JobLineItems({
  jobId,
  locked = false,
  onTotalsSaved,
  onLinesChanged,
}: {
  jobId: string
  /** invoiced jobs are frozen - the invoice is the record of truth by then */
  locked?: boolean
  onTotalsSaved?: (actualTotal: number) => void
  /** lets the parent defer its own actual_total field to these lines */
  onLinesChanged?: (lineCount: number, subtotal: number) => void
}) {
  const [items, setItems] = useState<JobLineItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('job_line_items')
      .select('*')
      .eq('job_id', jobId)
      .order('item_order')

    if (loadError) {
      setError(loadError.message)
    } else {
      const rows = (data as JobLineItem[]) || []
      setItems(rows)
      setError(null)
      const billableRows = rows.filter((item) => !item.is_optional)
      onLinesChanged?.(
        billableRows.length,
        round2(billableRows.reduce((sum, item) => sum + Number(item.line_total || 0), 0))
      )
    }
    setLoading(false)
  }, [jobId, onLinesChanged])

  useEffect(() => {
    load()
  }, [load])

  const updateRow = (id: string, patch: Partial<JobLineItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...patch }
        next.line_total = round2(Number(next.quantity || 0) * Number(next.unit_price || 0))
        return next
      })
    )
    setDirty(true)
  }

  const addRow = () => {
    setItems((prev) => [...prev, makeEmptyRow(jobId, prev.length + 1)])
    setDirty(true)
  }

  const removeRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    if (!id.startsWith('new-')) setDeletedIds((prev) => [...prev, id])
    setDirty(true)
  }

  const billable = items.filter((item) => !item.is_optional)
  const subtotal = round2(billable.reduce((sum, item) => sum + Number(item.line_total || 0), 0))
  // GST on the whole subtotal, matching the quote engine and the invoice route.
  // Per-line is_taxable is NOT honoured: the app writes it false on nearly every
  // line while quotes charge 10% regardless, so trusting it would show $0 GST
  // here and on the invoice. See src/app/api/invoices/from-job/route.ts.
  const gst = round2(subtotal * GST_RATE)
  const total = round2(subtotal + gst)

  const save = async () => {
    const supabase = createClient()
    if (!supabase) return

    if (items.some((item) => !item.description.trim())) {
      setError('Every line needs a description.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (deletedIds.length > 0) {
        const { error: delError } = await supabase
          .from('job_line_items')
          .delete()
          .in('id', deletedIds)
        if (delError) throw delError
      }

      const newRows = items.filter((item) => item.isNew)
      if (newRows.length > 0) {
        const { error: insError } = await supabase.from('job_line_items').insert(
          newRows.map((item, index) => ({
            job_id: jobId,
            item_order: item.item_order ?? index + 1,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            line_total: item.line_total,
            is_taxable: item.is_taxable ?? true,
            is_optional: item.is_optional ?? false,
          }))
        )
        if (insError) throw insError
      }

      const existingRows = items.filter((item) => !item.isNew)
      for (const item of existingRows) {
        const { error: updError } = await supabase
          .from('job_line_items')
          .update({
            item_order: item.item_order,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            line_total: item.line_total,
            is_taxable: item.is_taxable ?? true,
            is_optional: item.is_optional ?? false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        if (updError) throw updError
      }

      // The job's actual_total is the sum of its billable lines. This is what the
      // invoice is built from, so it must not drift from the lines.
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ actual_total: subtotal, updated_at: new Date().toISOString() })
        .eq('id', jobId)
      if (jobError) throw jobError

      setDeletedIds([])
      setDirty(false)
      setSavedAt(new Date().toLocaleTimeString('en-AU'))
      onTotalsSaved?.(subtotal)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save line items.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">Line Items</h3>
          <p className="text-sm text-gray-400 mt-1">
            {locked
              ? 'This job has been invoiced - its lines are locked.'
              : 'Adjust for variations and actual work done. The invoice is built from these lines.'}
          </p>
        </div>
        {!locked && (
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-flowtrade-cyan text-flowtrade-navy font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-400">No line items on this job.</p>
          {!locked && (
            <p className="text-sm text-gray-500 mt-1">
              Add lines below - without them the invoice will have no detail.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-flowtrade-navy-lighter">
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium w-20 text-center">Qty</th>
                <th className="px-2 py-2 font-medium w-24 text-center">Unit</th>
                <th className="px-2 py-2 font-medium w-28 text-right">Unit Price</th>
                <th className="px-2 py-2 font-medium w-28 text-right">Total</th>
                {!locked && <th className="px-2 py-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-flowtrade-navy-lighter/50">
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.description}
                      disabled={locked}
                      onChange={(e) => updateRow(item.id, { description: e.target.value })}
                      placeholder="Description"
                      className="w-full bg-transparent text-white placeholder-gray-600 outline-none disabled:opacity-70 focus:bg-flowtrade-navy rounded px-2 py-1"
                    />
                    {item.source_quote_line_item_id && (
                      <span className="text-[11px] text-gray-500 px-2">from quote</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      disabled={locked}
                      onChange={(e) => updateRow(item.id, { quantity: Number(e.target.value) })}
                      className="w-full bg-transparent text-white text-center outline-none disabled:opacity-70 focus:bg-flowtrade-navy rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.unit || ''}
                      disabled={locked}
                      onChange={(e) => updateRow(item.id, { unit: e.target.value })}
                      className="w-full bg-transparent text-white text-center outline-none disabled:opacity-70 focus:bg-flowtrade-navy rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      disabled={locked}
                      onChange={(e) => updateRow(item.id, { unit_price: Number(e.target.value) })}
                      className="w-full bg-transparent text-white text-right outline-none disabled:opacity-70 focus:bg-flowtrade-navy rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2 text-right text-white font-medium">
                    {formatCurrency(Number(item.line_total || 0))}
                  </td>
                  {!locked && (
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => removeRow(item.id)}
                        aria-label="Remove line"
                        className="text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!locked && (
        <button
          onClick={addRow}
          className="mt-4 inline-flex items-center gap-2 text-sm text-flowtrade-cyan hover:underline"
        >
          <Plus className="h-4 w-4" />
          Add line
        </button>
      )}

      {items.length > 0 && (
        <div className="mt-6 pt-4 border-t border-flowtrade-navy-lighter space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>GST (10%)</span>
            <span>{formatCurrency(gst)}</span>
          </div>
          <div className="flex justify-between text-white font-semibold text-base">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {dirty && !locked && (
        <p className="mt-3 text-xs text-amber-400">
          Unsaved changes - save before generating the invoice.
        </p>
      )}
      {savedAt && !dirty && (
        <p className="mt-3 text-xs text-gray-500">Saved at {savedAt}</p>
      )}
    </div>
  )
}
