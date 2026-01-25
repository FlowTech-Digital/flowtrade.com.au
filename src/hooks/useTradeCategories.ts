import { useState, useEffect } from 'react'

type TradeCategory = {
  id: string
  category_name: string
  display_order: number
}

export function useTradeCategories(tradeType: string | null) {
  const [categories, setCategories] = useState<TradeCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      if (!tradeType) {
        setCategories([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/trade-categories/${tradeType}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch categories')
        }

        setCategories(data.categories || [])
      } catch (err) {
        console.error('Error fetching trade categories:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [tradeType])

  return { categories, loading, error }
}
