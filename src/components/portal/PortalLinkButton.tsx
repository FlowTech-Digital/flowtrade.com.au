'use client'

import { useState } from 'react'
import { Link2, Loader2, Check, Copy, X, ExternalLink } from 'lucide-react'
import { usePortalLink } from '@/hooks/usePortalLink'

type PortalLinkButtonProps = {
  resourceType: 'quote' | 'invoice'
  resourceId: string
  variant?: 'button' | 'menu-item'
  className?: string
}

export function PortalLinkButton({
  resourceType,
  resourceId,
  variant = 'button',
  className = '',
}: PortalLinkButtonProps) {
  const { generateLink, copyToClipboard, loading, error, result, reset } = usePortalLink()
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const data = await generateLink(resourceType, resourceId)
    if (data) {
      setShowModal(true)
    }
  }

  const handleCopy = async () => {
    if (result?.portal_url) {
      const success = await copyToClipboard(result.portal_url)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleClose = () => {
    setShowModal(false)
    reset()
    setCopied(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={loading}
          className={`w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2 ${className}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Get Portal Link
        </button>
        {showModal && <PortalLinkModal />}
      </>
    )
  }

  function PortalLinkModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-flowtrade-cyan/20 rounded-full flex items-center justify-center">
                <Link2 className="h-5 w-5 text-flowtrade-cyan" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Customer Portal Link</h3>
                <p className="text-gray-400 text-sm">
                  Share this link with your customer
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : result ? (
            <>
              <div className="bg-flowtrade-navy rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result.portal_url}
                    className="flex-1 bg-transparent text-white text-sm truncate outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 bg-flowtrade-cyan/20 text-flowtrade-cyan rounded hover:bg-flowtrade-cyan/30 transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Expires</span>
                  <span className="text-white">{formatDate(result.expires_at)}</span>
                </div>
                {result.reused && (
                  <p className="text-gray-500 text-xs">
                    Using existing valid link (not expired)
                  </p>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <a
                  href={result.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Portal
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white rounded-lg hover:bg-flowtrade-navy transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Portal Link
      </button>
      {showModal && <PortalLinkModal />}
    </>
  )
}
