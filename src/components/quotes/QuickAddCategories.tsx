'use client'

import { Plus, Loader2 } from 'lucide-react'
import { useTradeCategories } from '@/hooks/useTradeCategories'

type QuickAddCategoriesProps = {
  tradeType: string | null
  onAddCategory: (categoryName: string) => void
  usedCategories?: string[]
}

export function QuickAddCategories({
  tradeType,
  onAddCategory,
  usedCategories = []
}: QuickAddCategoriesProps) {
  const { categories, loading, error } = useTradeCategories(tradeType)

  if (!tradeType) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading categories...
      </div>
    )
  }

  if (error || categories.length === 0) {
    return null
  }

  // Filter out already-used categories
  const availableCategories = categories.filter(
    (cat) => !usedCategories.includes(cat.category_name)
  )

  if (availableCategories.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-2">
        All categories added
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        Quick Add Categories
      </p>
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onAddCategory(category.category_name)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-full text-sm text-gray-300 hover:text-white hover:border-flowtrade-cyan/50 hover:bg-flowtrade-navy-lighter transition-all duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            {category.category_name}
          </button>
        ))}
      </div>
    </div>
  )
}
