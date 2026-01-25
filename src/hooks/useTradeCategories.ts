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
  const [hasCustomCategories, setHasCustomCategories] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!tradeType) {
      setCategories([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let customCategories: TradeCategory[] = []
      
      // Always fetch user's custom categories first
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check if user has ANY custom categories (for hasCustomCategories flag)
          const { data: allCustomData } = await supabase
            .from('user_custom_categories')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
          
          setHasCustomCategories((allCustomData || []).length > 0)
          
          // For 'custom' trade type, get ALL user's custom categories
          if (tradeType === 'custom') {
            const { data: customData } = await supabase
              .from('user_custom_categories')
              .select('id, category_name, trade_type')
              .eq('user_id', user.id)
              .order('category_name')
            
            customCategories = (customData || []).map((cat) => ({
              id: cat.id,
              category_name: cat.category_name,
              display_order: 999,
              is_custom: true
            }))
            
            // For custom trade type, only return custom categories
            setCategories(customCategories)
            setLoading(false)
            return
          }
          
          // For other trade types, get custom categories for that trade type
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
      }

      // Fetch default categories from API (skip for 'custom' trade type)
      const response = await fetch(`/api/trade-categories/${tradeType}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories')
      }

      const defaultCategories = (data.categories || []).map((cat: TradeCategory) => ({
        ...cat,
        is_custom: false
      }))

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
    if (!tradeType || tradeType === 'custom') return false
    
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
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

      // Update hasCustomCategories flag
      setHasCustomCategories(true)
      
      // Refresh categories
      await fetchCategories()
      return true
    } catch (err) {
      console.error('Error adding custom category:', err)
      return false
    }
  }, [tradeType, fetchCategories])

  return { categories, loading, error, addCustomCategory, refetch: fetchCategories, hasCustomCategories }
}

// Standalone hook to check if user has any custom categories
export function useHasCustomCategories() {
  const [hasCustom, setHasCustom] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient()
        if (!supabase) {
          setLoading(false)
          return
        }
        
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data } = await supabase
            .from('user_custom_categories')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
          
          setHasCustom((data || []).length > 0)
        }
      } catch (err) {
        console.error('Error checking custom categories:', err)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  return { hasCustomCategories: hasCustom, loading }
}
