'use client'

import { useState } from 'react'
import { Plus, Loader2, X, Check } from 'lucide-react'
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
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')

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

  if (error) {
    return null
  }

  // Filter out already-used categories
  const availableCategories = categories.filter(
    (cat) => !usedCategories.includes(cat.category_name)
  )

  const handleAddCustom = () => {
    const trimmed = customValue.trim()
    if (trimmed && !usedCategories.includes(trimmed)) {
      onAddCategory(trimmed)
      setCustomValue('')
      setShowCustomInput(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomValue('')
    }
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
        
        {/* Custom "Other" option */}
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-flowtrade-navy border border-dashed border-flowtrade-navy-lighter rounded-full text-sm text-gray-400 hover:text-flowtrade-cyan hover:border-flowtrade-cyan/50 transition-all duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            Other...
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 bg-flowtrade-navy border border-flowtrade-cyan/50 rounded-full pl-3 pr-1 py-0.5">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Custom category"
              autoFocus
              className="w-32 sm:w-40 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customValue.trim()}
              className="p-1.5 text-flowtrade-cyan hover:bg-flowtrade-cyan/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false)
                setCustomValue('')
              }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      
      {availableCategories.length === 0 && !showCustomInput && (
        <p className="text-gray-500 text-sm">
          All preset categories added. Use "Other..." to add custom.
        </p>
      )}
    </div>
  )
}
