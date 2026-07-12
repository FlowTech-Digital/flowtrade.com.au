'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Percent, Save, Loader2, AlertCircle, Check } from 'lucide-react'
import { DEFAULT_TAX_SETTINGS, taxSettingsFromRow, taxLineLabel, type TaxSettings as Tax } from '@/lib/tax'

const COMMON_LABELS = ['GST', 'VAT', 'Sales Tax', 'Tax']

/**
 * Organisation tax settings: on/off, rate, label.
 *
 * FlowTrade was hardcoded to Australian GST at 10%. This is what makes it usable
 * outside Australia - or by an org that is not registered for tax at all.
 *
 * Changing these affects NEW quotes and invoices only. Existing documents keep
 * the rate they were issued under (quotes and invoices both snapshot tax_rate),
 * so history never silently re-prices.
 */
export default function TaxSettings() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [tax, setTax] = useState<Tax>(DEFAULT_TAX_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userRow?.org_id) {
      setLoading(false)
      return
    }
    setOrgId(userRow.org_id)

    const { data: settings, error: loadError } = await supabase
      .from('org_settings')
      .select('tax_enabled, default_gst_rate, tax_label')
      .eq('org_id', userRow.org_id)
      .single()

    if (loadError) setError(loadError.message)
    setTax(taxSettingsFromRow(settings))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = (patch: Partial<Tax>) => {
    setTax((prev) => ({ ...prev, ...patch }))
    setDirty(true)
    setSaved(false)
  }

  const save = async () => {
    if (!orgId) return
    const rate = Number(tax.rate)

    if (tax.enabled && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      setError('Tax rate must be between 0 and 100.')
      return
    }
    if (tax.enabled && !tax.label.trim()) {
      setError('Give the tax a name (GST, VAT, Sales Tax...).')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) return

    const { error: saveError } = await supabase
      .from('org_settings')
      .update({
        tax_enabled: tax.enabled,
        default_gst_rate: rate,
        tax_label: tax.label.trim() || 'GST',
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)

    if (saveError) {
      setError(saveError.message)
    } else {
      setDirty(false)
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-flowtrade-cyan/10">
            <Percent className="h-5 w-5 text-flowtrade-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Tax</h3>
            <p className="text-sm text-gray-400">
              Applies to new quotes and invoices. Existing ones keep the rate they were issued
              under.
            </p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty || loading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-flowtrade-cyan text-flowtrade-navy font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* On / off */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tax.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-flowtrade-navy-lighter bg-flowtrade-navy text-flowtrade-cyan focus:ring-flowtrade-cyan"
            />
            <span>
              <span className="block text-white font-medium">Charge tax</span>
              <span className="block text-sm text-gray-400">
                Turn this off if you are not registered for tax, or your country has none.
                Quotes and invoices will show no tax line.
              </span>
            </span>
          </label>

          {tax.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={tax.rate}
                  onChange={(e) => update({ rate: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Australia 10 &middot; New Zealand 15 &middot; UK 20
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Called</label>
                <input
                  type="text"
                  value={tax.label}
                  onChange={(e) => update({ label: e.target.value })}
                  placeholder="GST"
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COMMON_LABELS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => update({ label })}
                      className={`px-2 py-0.5 rounded text-xs transition ${
                        tax.label === label
                          ? 'bg-flowtrade-cyan text-flowtrade-navy'
                          : 'bg-flowtrade-navy text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* What documents will say */}
          <div className="rounded-lg bg-flowtrade-navy px-4 py-3 text-sm">
            <span className="text-gray-400">Quotes and invoices will show: </span>
            <span className="text-white font-medium">
              {tax.enabled ? taxLineLabel(tax) : 'no tax line'}
            </span>
          </div>

          {saved && !dirty && (
            <p className="flex items-center gap-1.5 text-xs text-green-400">
              <Check className="h-3.5 w-3.5" />
              Saved. New quotes and invoices will use this.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
