'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_TAX_SETTINGS, taxSettingsFromRow, type TaxSettings } from '@/lib/tax'

/**
 * The current organisation's tax settings.
 *
 * Use this instead of hardcoding 0.1 / 10. Returns the Australian default
 * (GST 10%) until the real settings load, so a first render never shows a
 * wrong-but-plausible zero.
 */
export function useOrgTax(): { tax: TaxSettings; loading: boolean } {
  const [tax, setTax] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

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

      const { data: settings } = await supabase
        .from('org_settings')
        .select('tax_enabled, default_gst_rate, tax_label')
        .eq('org_id', userRow.org_id)
        .single()

      if (!cancelled) {
        setTax(taxSettingsFromRow(settings))
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { tax, loading }
}
