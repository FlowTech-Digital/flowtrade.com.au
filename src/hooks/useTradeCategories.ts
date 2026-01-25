import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type TradeCategory = {
  id: string
  category_name: string
  display_order: number
  is_custom?: boolean
}

export function useTradeCategories(tradeType: string | null) {
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!tradeType) {
      setCategories([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch default categories from API
      const response = await fetch(`/api/trade-categories/${tradeType}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories')
      }

      const defaultCategories = (data.categories || []).map((cat: TradeCategory) => ({
        ...cat,
        is_custom: false
      }))

      // Fetch user's custom categories from Supabase
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let customCategories: TradeCategory[] = []
      if (user) {
        const { data: customData } = await supabase
          .from('user_custom_categories')
          .select('id, category_name')
          .eq('trade_type', tradeType)
          .eq('user_id', user.id)
          .order('category_name')
        
        customCategories = (customData || []).map((cat) => ({
          id: cat.id,
          category_name: cat.category_name,
          display_order: 999,
          is_custom: true
        }))
      }

      // Combine: defaults first, then custom
      setCategories([...defaultCategories, ...customCategories])
    } catch (err) {
      console.error('Error fetching trade categories:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [tradeType])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCustomCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    if (!tradeType) return false
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Must be logged in to add custom categories')
      }

      const { error: insertError } = await supabase
        .from('user_custom_categories')
        .insert({
          user_id: user.id,
          trade_type: tradeType,
          category_name: categoryName
        })

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate - already exists, still treat as success
          return true
        }
        throw insertError
      }

      // Refresh categories
      await fetchCategories()
      return true
    } catch (err) {
      console.error('Error adding custom category:', err)
      return false
    }
  }, [tradeType, fetchCategories])

  return { categories, loading, error, addCustomCategory, refetch: fetchCategories }
}
