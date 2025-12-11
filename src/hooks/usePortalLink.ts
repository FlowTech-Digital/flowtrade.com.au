import { useState } from 'react'

type PortalLinkResult = {
  token: string
  portal_url: string
  expires_at: string
  reused: boolean
}

export function usePortalLink() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PortalLinkResult | null>(null)

  const generateLink = async (resourceType: 'quote' | 'invoice', resourceId: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/portal/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate portal link')
      }

      setResult(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate portal link'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }

  return {
    generateLink,
    copyToClipboard,
    loading,
    error,
    result,
    reset: () => {
      setError(null)
      setResult(null)
    },
  }
}
