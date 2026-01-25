'use client'

import { useState } from 'react'
import { Plus, Loader2, X, Check } from 'lucide-react'
import { useTradeCategories } from '@/hooks/useTradeCategories'

type QuickAddCategoriesProps = {
  tradeType: string | null
  onAddCategory: (categoryName: string) => void
  usedCategories?: string[]
  onCustomCategoryAdded?: () => void
}

export function QuickAddCategories({
  tradeType,
  onAddCategory,
  usedCategories = [],
  onCustomCategoryAdded
}: QuickAddCategoriesProps) {
  const { categories, loading, error, addCustomCategory } = useTradeCategories(tradeType)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [saving, setSaving] = useState(false)

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

  const handleAddCustom = async () => {
    const trimmed = customValue.trim()
    if (!trimmed || usedCategories.includes(trimmed)) return
    
    setSaving(true)
    try {
      // Save to database for future use (skip if viewing 'custom' trade type)
      if (tradeType !== 'custom') {
        const saved = await addCustomCategory(trimmed)
        
        if (saved) {
          // Notify parent that custom category was added
          onCustomCategoryAdded?.()
        }
      }
      
      // Add to current quote regardless
      onAddCategory(trimmed)
      setCustomValue('')
      setShowCustomInput(false)
    } finally {
      setSaving(false)
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-flowtrade-navy border rounded-full text-sm transition-all duration-150 ${
              category.is_custom
                ? 'border-flowtrade-cyan/30 text-flowtrade-cyan hover:border-flowtrade-cyan hover:bg-flowtrade-cyan/10'
                : 'border-flowtrade-navy-lighter text-gray-300 hover:text-white hover:border-flowtrade-cyan/50 hover:bg-flowtrade-navy-lighter'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {category.category_name}
          </button>
        ))}
        
        {/* Custom "Other" option - hide when viewing custom trade type */}
        {tradeType !== 'custom' && !showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-flowtrade-navy border border-dashed border-flowtrade-navy-lighter rounded-full text-sm text-gray-400 hover:text-flowtrade-cyan hover:border-flowtrade-cyan/50 transition-all duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            Other...
          </button>
        ) : showCustomInput ? (
          <div className="inline-flex items-center gap-1 bg-flowtrade-navy border border-flowtrade-cyan/50 rounded-full pl-3 pr-1 py-0.5">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Custom category"
              autoFocus
              disabled={saving}
              className="w-32 sm:w-40 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customValue.trim() || saving}
              className="p-1.5 text-flowtrade-cyan hover:bg-flowtrade-cyan/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false)
                setCustomValue('')
              }}
              disabled={saving}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      
      {availableCategories.length === 0 && tradeType === 'custom' && (
        <p className="text-gray-500 text-sm">
          No custom categories yet. Add some using other trade types!
        </p>
      )}
      
      {availableCategories.length === 0 && tradeType !== 'custom' && !showCustomInput && (
        <p className="text-gray-500 text-sm">
          All preset categories added. Use &ldquo;Other...&rdquo; to add custom.
        </p>
      )}
    </div>
  )
}
