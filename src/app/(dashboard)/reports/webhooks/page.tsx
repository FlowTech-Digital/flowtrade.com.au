'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Webhook,
  Filter,
  RotateCcw,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react'

type WebhookEvent = {
  id: string
  event_id: string
  event_type: string
  source: string
  status: 'received' | 'processed' | 'failed'
  payload: Record<string, unknown>
  error_message: string | null
  processed_at: string | null
  created_at: string
  org_id: string
}

type EventFilter = {
  status: 'all' | 'received' | 'processed' | 'failed'
  eventType: string
  dateRange: '24h' | '7d' | '30d' | 'all'
}

export default function WebhooksPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [filters, setFilters] = useState<EventFilter>({
    status: 'all',
    eventType: 'all',
    dateRange: '7d'
  })

  // Get unique event types from events
  const eventTypes = Array.from(new Set(events.map(e => e.event_type))).sort()

  const fetchEvents = useCallback(async () => {
    if (!user) return

    const supabase = createClient()
    if (!supabase) return

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      setLoading(false)
      return
    }

    // Build date filter
    let dateFilter = new Date()
    switch (filters.dateRange) {
      case '24h':
        dateFilter.setHours(dateFilter.getHours() - 24)
        break
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7)
        break
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30)
        break
      case 'all':
        dateFilter = new Date('2020-01-01')
        break
    }

    let query = supabase
      .from('webhook_events')
      .select('*')
      .eq('org_id', userData.org_id)
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply status filter
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Apply event type filter
    if (filters.eventType !== 'all') {
      query = query.eq('event_type', filters.eventType)
    }

    const { data, error } = await query

    if (!error && data) {
      setEvents(data as WebhookEvent[])
    }
    setLastRefresh(new Date())
    setLoading(false)
  }, [user, filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchEvents()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchEvents])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const retryEvent = async (event: WebhookEvent) => {
    if (event.status !== 'failed') return
    
    setRetrying(event.id)
    
    try {
      // Re-process the webhook by calling the webhook endpoint again
      const response = await fetch(`/api/webhooks/${event.source}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-retry-event-id': event.id
        },
        body: JSON.stringify(event.payload)
      })

      if (response.ok) {
        // Refresh events to show updated status
        await fetchEvents()
      }
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setRetrying(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'received':
      default:
        return <Clock className="h-4 w-4 text-amber-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'received':
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
  }

  const formatEventType = (type: string) => {
    return type.replace(/\./g, ' → ').replace(/_/g, ' ')
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  const getTimeSince = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  // Stats calculations
  const stats = {
    total: events.length,
    processed: events.filter(e => e.status === 'processed').length,
    failed: events.filter(e => e.status === 'failed').length,
    received: events.filter(e => e.status === 'received').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Webhook className="h-8 w-8 text-flowtrade-cyan" />
            Webhook Events
          </h1>
          <p className="text-gray-400">Monitor Stripe and Square webhook events</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              autoRefresh 
                ? 'bg-flowtrade-cyan/20 text-flowtrade-cyan border border-flowtrade-cyan/30' 
                : 'bg-flowtrade-navy-light text-gray-400 border border-flowtrade-navy-lighter hover:text-white'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
          </button>
          
          {/* Manual refresh */}
          <button
            onClick={() => fetchEvents()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-flowtrade-navy-light text-gray-400 border border-flowtrade-navy-lighter hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Events</CardTitle>
            <Webhook className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-gray-500">Last updated: {formatTimestamp(lastRefresh.toISOString())}</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.processed}</div>
            <p className="text-xs text-gray-500">
              {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats.received}</div>
            <p className="text-xs text-gray-500">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <p className="text-xs text-gray-500">
              {stats.failed > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-flowtrade-cyan" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Status filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as EventFilter['status'] })}
                className="bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
              >
                <option value="all">All Statuses</option>
                <option value="received">Received</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Event type filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan min-w-[200px]"
              >
                <option value="all">All Event Types</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{formatEventType(type)}</option>
                ))}
              </select>
            </div>

            {/* Date range filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Date Range</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as EventFilter['dateRange'] })}
                  className="bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
        <CardHeader>
          <CardTitle className="text-white">Event Log</CardTitle>
          <CardDescription className="text-gray-400">
            {events.length} events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No webhook events found</p>
              <p className="text-gray-500 text-sm">Events will appear here when received from Stripe or Square</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="bg-flowtrade-navy rounded-lg overflow-hidden">
                  {/* Event Row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-flowtrade-navy-lighter/50 transition-colors"
                    onClick={() => toggleRow(event.id)}
                  >
                    {/* Expand icon */}
                    <div className="text-gray-400">
                      {expandedRows.has(event.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.status)}
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>

                    {/* Event type */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{formatEventType(event.event_type)}</p>
                      <p className="text-gray-500 text-xs truncate">{event.event_id}</p>
                    </div>

                    {/* Source */}
                    <div className="hidden sm:block">
                      <span className="px-2 py-1 text-xs rounded-full bg-flowtrade-navy-lighter text-gray-300 capitalize">
                        {event.source}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="text-right">
                      <p className="text-gray-300 text-sm">{getTimeSince(event.created_at)}</p>
                      <p className="text-gray-500 text-xs">{formatTimestamp(event.created_at)}</p>
                    </div>

                    {/* Actions */}
                    {event.status === 'failed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          retryEvent(event)
                        }}
                        disabled={retrying === event.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        {retrying === event.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Retry
                      </button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedRows.has(event.id) && (
                    <div className="border-t border-flowtrade-navy-lighter p-4 space-y-4">
                      {/* Error message if failed */}
                      {event.status === 'failed' && event.error_message && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-red-400 text-sm font-medium">Error Message</p>
                          <p className="text-red-300 text-sm mt-1">{event.error_message}</p>
                        </div>
                      )}

                      {/* Event details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Event ID</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-white bg-flowtrade-navy-lighter px-2 py-1 rounded text-xs">
                              {event.event_id}
                            </code>
                            <button
                              onClick={() => copyToClipboard(event.event_id, `event-${event.id}`)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedId === `event-${event.id}` ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400">Source</p>
                          <p className="text-white mt-1 capitalize">{event.source}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Created</p>
                          <p className="text-white mt-1">{formatTimestamp(event.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Processed</p>
                          <p className="text-white mt-1">
                            {event.processed_at ? formatTimestamp(event.processed_at) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* JSON Payload */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-400 text-sm font-medium">Payload</p>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(event.payload, null, 2), `payload-${event.id}`)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedId === `payload-${event.id}` ? (
                              <>
                                <Check className="h-3 w-3 text-green-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy JSON
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-flowtrade-navy-lighter rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-64">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Stripe Dashboard Link */}
                      {event.source === 'stripe' && (
                        <a
                          href={`https://dashboard.stripe.com/events/${event.event_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-flowtrade-cyan hover:text-flowtrade-cyan/80 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View in Stripe Dashboard
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
