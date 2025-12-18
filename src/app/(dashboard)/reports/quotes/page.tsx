'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { 
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  RefreshCw,
  Loader2,
  BarChart3,
  XCircle,
  FileSpreadsheet
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker'
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns'

type Quote = {
  id: string
  quote_number: string
  status: string
  total: number
  valid_until: string | null
  created_at: string
  customer_id: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
}

type QuoteMetrics = {
  totalQuotes: number
  pendingQuotes: number
  acceptedQuotes: number
  declinedQuotes: number
  expiredQuotes: number
  conversionRate: number
  totalValue: number
  avgQuoteValue: number
  statusBreakdown: {
    draft: number
    sent: number
    viewed: number
    accepted: number
    declined: number
    expired: number
  }
}

type DailyTrend = {
  date: string
  count: number
  value: number
}

type TopCustomer = {
  id: string
  name: string
  quoteCount: number
  totalValue: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  viewed: '#8B5CF6',
  accepted: '#10B981',
  declined: '#EF4444',
  expired: '#F97316',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}

export default function QuotesReportPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [metrics, setMetrics] = useState<QuoteMetrics | null>(null)
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'd MMM')
  }

  const formatDateFull = (dateString: string) => {
    return format(parseISO(dateString), 'd MMM yyyy')
  }

  const getCustomerName = (customer: Quote['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  const calculateMetrics = useCallback((quotesData: Quote[]): QuoteMetrics => {
    const statusBreakdown = {
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
    }

    let totalValue = 0

    quotesData.forEach(quote => {
      const status = quote.status as keyof typeof statusBreakdown
      if (status in statusBreakdown) {
        statusBreakdown[status]++
      }
      totalValue += quote.total || 0
    })

    const totalQuotes = quotesData.length
    const pendingQuotes = statusBreakdown.draft + statusBreakdown.sent + statusBreakdown.viewed
    const acceptedQuotes = statusBreakdown.accepted
    const declinedQuotes = statusBreakdown.declined
    const expiredQuotes = statusBreakdown.expired
    
    const finalizedQuotes = acceptedQuotes + declinedQuotes + expiredQuotes
    const conversionRate = finalizedQuotes > 0 
      ? Math.round((acceptedQuotes / finalizedQuotes) * 100) 
      : 0

    const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0

    return {
      totalQuotes,
      pendingQuotes,
      acceptedQuotes,
      declinedQuotes,
      expiredQuotes,
      conversionRate,
      totalValue,
      avgQuoteValue,
      statusBreakdown,
    }
  }, [])

  const calculateDailyTrends = useCallback((quotesData: Quote[], from: Date, to: Date): DailyTrend[] => {
    const days = eachDayOfInterval({ start: from, end: to })
    
    const dailyData = days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const dayQuotes = quotesData.filter(quote => {
        const quoteDate = parseISO(quote.created_at)
        return quoteDate >= dayStart && quoteDate <= dayEnd
      })

      return {
        date: format(day, 'yyyy-MM-dd'),
        count: dayQuotes.length,
        value: dayQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
      }
    })

    return dailyData
  }, [])

  const calculateTopCustomers = useCallback((quotesData: Quote[]): TopCustomer[] => {
    const customerMap = new Map<string, { name: string; quoteCount: number; totalValue: number }>()

    quotesData.forEach(quote => {
      if (!quote.customer_id) return
      
      const existing = customerMap.get(quote.customer_id)
      const customerName = getCustomerName(quote.customer)
      
      if (existing) {
        existing.quoteCount++
        existing.totalValue += quote.total || 0
      } else {
        customerMap.set(quote.customer_id, {
          name: customerName,
          quoteCount: 1,
          totalValue: quote.total || 0,
        })
      }
    })

    return Array.from(customerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  }, [])

  const fetchQuoteData = useCallback(async () => {
    if (!user || !dateRange.from || !dateRange.to) return

    setRefreshing(true)
    const supabase = createClient()
    if (!supabase) {
      setRefreshing(false)
      setLoading(false)
      return
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userData?.org_id) {
        console.error('Failed to get user org:', userError)
        setRefreshing(false)
        setLoading(false)
        return
      }

      const fromDate = startOfDay(dateRange.from).toISOString()
      const toDate = endOfDay(dateRange.to).toISOString()

      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          status,
          total,
          valid_until,
          created_at,
          customer_id,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('org_id', userData.org_id)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false })

      if (quotesError) {
        console.error('Failed to fetch quotes:', quotesError)
      } else {
        const quotes = quotesData || []
        setQuotes(quotes)
        setMetrics(calculateMetrics(quotes))
        setDailyTrends(calculateDailyTrends(quotes, dateRange.from, dateRange.to))
        setTopCustomers(calculateTopCustomers(quotes))
      }
    } catch (error) {
      console.error('Error fetching quote data:', error)
    }

    setRefreshing(false)
    setLoading(false)
  }, [user, dateRange, calculateMetrics, calculateDailyTrends, calculateTopCustomers])

  useEffect(() => {
    fetchQuoteData()
  }, [fetchQuoteData])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
  }

  const periodLabel = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 'Select date range'
    return `${format(dateRange.from, 'd MMM yyyy')} - ${format(dateRange.to, 'd MMM yyyy')}`
  }, [dateRange])

  const pieChartData = metrics ? Object.entries(metrics.statusBreakdown)
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || '#6B7280',
    })) : []

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (quotes.length === 0) return

    setExporting('csv')

    try {
      const headers = ['Quote Number', 'Customer', 'Status', 'Total', 'Valid Until', 'Created At']
      const rows = quotes.map(quote => [
        quote.quote_number,
        getCustomerName(quote.customer),
        quote.status,
        quote.total?.toString() || '0',
        quote.valid_until || '',
        quote.created_at,
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = dateRange.from && dateRange.to 
        ? `${format(dateRange.from, 'yyyyMMdd')}-${format(dateRange.to, 'yyyyMMdd')}`
        : format(new Date(), 'yyyyMMdd')
      a.href = url
      a.download = `quotes-report-${dateStr}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export error:', error)
    } finally {
      setExporting(null)
    }
  }, [quotes, dateRange])

  // Export to PDF
  const exportToPDF = useCallback(() => {
    if (!metrics) return

    setExporting('pdf')

    try {
      const reportDate = new Date().toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>FlowTrade Quotes Report - ${periodLabel}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1f2937;
              line-height: 1.6;
            }
            .header { 
              border-bottom: 3px solid #00D4AA;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo { 
              font-size: 28px;
              font-weight: 700;
              color: #0f172a;
            }
            .logo span { color: #00D4AA; }
            .report-title {
              font-size: 20px;
              color: #6b7280;
              margin-top: 8px;
            }
            .report-meta {
              font-size: 14px;
              color: #9ca3af;
              margin-top: 4px;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .metric-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
            }
            .metric-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .metric-value {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 4px;
            }
            .metric-sub {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 4px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #0f172a;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            th {
              background: #f3f4f6;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              color: #4b5563;
            }
            .status-draft { color: #6B7280; }
            .status-sent { color: #3B82F6; }
            .status-viewed { color: #8B5CF6; }
            .status-accepted { color: #10B981; font-weight: 500; }
            .status-declined { color: #EF4444; font-weight: 500; }
            .status-expired { color: #F97316; }
            .amount { font-weight: 600; text-align: right; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #9ca3af;
              text-align: center;
            }
            .summary-row {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }
            .summary-item {
              background: #f9fafb;
              padding: 12px;
              border-radius: 6px;
              text-align: center;
            }
            .summary-count {
              font-size: 18px;
              font-weight: 700;
            }
            .summary-label {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .gray { color: #6B7280; }
            .blue { color: #3B82F6; }
            .purple { color: #8B5CF6; }
            .green { color: #10B981; }
            .red { color: #EF4444; }
            .orange { color: #F97316; }
            @media print {
              body { padding: 20px; }
              .metric-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Flow<span>Trade</span></div>
            <div class="report-title">Quotes Analytics Report</div>
            <div class="report-meta">
              Period: ${periodLabel}
              <br>Generated: ${reportDate}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Quotes</div>
              <div class="metric-value">${metrics.totalQuotes}</div>
              <div class="metric-sub">${periodLabel.toLowerCase()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Conversion Rate</div>
              <div class="metric-value">${metrics.conversionRate}%</div>
              <div class="metric-sub">${metrics.acceptedQuotes} accepted of ${metrics.acceptedQuotes + metrics.declinedQuotes + metrics.expiredQuotes} finalized</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Value</div>
              <div class="metric-value">${formatCurrency(metrics.totalValue)}</div>
              <div class="metric-sub">All quotes in period</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Quote Value</div>
              <div class="metric-value">${formatCurrency(metrics.avgQuoteValue)}</div>
              <div class="metric-sub">Per quote average</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Pending</div>
              <div class="metric-value">${metrics.pendingQuotes}</div>
              <div class="metric-sub">Draft + Sent + Viewed</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Declined/Expired</div>
              <div class="metric-value">${metrics.declinedQuotes + metrics.expiredQuotes}</div>
              <div class="metric-sub">${metrics.declinedQuotes} declined, ${metrics.expiredQuotes} expired</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Status Breakdown</div>
            <div class="summary-row">
              <div class="summary-item">
                <div class="summary-count gray">${metrics.statusBreakdown.draft}</div>
                <div class="summary-label">Draft</div>
              </div>
              <div class="summary-item">
                <div class="summary-count blue">${metrics.statusBreakdown.sent}</div>
                <div class="summary-label">Sent</div>
              </div>
              <div class="summary-item">
                <div class="summary-count purple">${metrics.statusBreakdown.viewed}</div>
                <div class="summary-label">Viewed</div>
              </div>
              <div class="summary-item">
                <div class="summary-count green">${metrics.statusBreakdown.accepted}</div>
                <div class="summary-label">Accepted</div>
              </div>
              <div class="summary-item">
                <div class="summary-count red">${metrics.statusBreakdown.declined}</div>
                <div class="summary-label">Declined</div>
              </div>
              <div class="summary-item">
                <div class="summary-count orange">${metrics.statusBreakdown.expired}</div>
                <div class="summary-label">Expired</div>
              </div>
            </div>
          </div>

          ${topCustomers.length > 0 ? `
          <div class="section">
            <div class="section-title">Top Customers by Quote Value</div>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer</th>
                  <th>Quotes</th>
                  <th style="text-align: right;">Total Value</th>
                </tr>
              </thead>
              <tbody>
                ${topCustomers.map((c, i) => `
                  <tr>
                    <td>#${i + 1}</td>
                    <td>${c.name}</td>
                    <td>${c.quoteCount}</td>
                    <td class="amount">${formatCurrency(c.totalValue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Recent Quotes (Last 20)</div>
            <table>
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style="text-align: right;">Value</th>
                </tr>
              </thead>
              <tbody>
                ${quotes.slice(0, 20).map(q => `
                  <tr>
                    <td>${q.quote_number}</td>
                    <td>${getCustomerName(q.customer)}</td>
                    <td class="status-${q.status}">${STATUS_LABELS[q.status] || q.status}</td>
                    <td>${formatDateFull(q.created_at)}</td>
                    <td class="amount">${formatCurrency(q.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Generated by FlowTrade • flowtrade.com.au</p>
            <p>This report contains confidential business information.</p>
          </div>
        </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 250)
        }
      }
    } catch (error) {
      console.error('PDF export error:', error)
    } finally {
      setExporting(null)
    }
  }, [metrics, quotes, topCustomers, periodLabel])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-7 w-7 text-flowtrade-cyan" />
            Quotes Analytics
          </h1>
          <p className="text-gray-400 hidden sm:block">Track quote performance and conversion metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r border-flowtrade-navy-lighter pr-3">
            <button
              onClick={exportToCSV}
              disabled={exporting !== null || quotes.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-flowtrade-navy-light text-gray-400 border border-flowtrade-navy-lighter hover:text-green-400 hover:border-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              {exporting === 'csv' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting !== null || !metrics}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-flowtrade-navy-light text-gray-400 border border-flowtrade-navy-lighter hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to PDF"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </button>
          </div>

          <button
            onClick={fetchQuoteData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-gray-300 hover:text-white hover:border-flowtrade-cyan/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Total Quotes</h3>
            <FileText className="h-4 w-4 text-flowtrade-cyan" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.totalQuotes || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Pending</h3>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.pendingQuotes || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Draft + Sent + Viewed</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Conversion</h3>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.conversionRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">{metrics?.acceptedQuotes || 0} accepted</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Avg Value</h3>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.avgQuoteValue || 0)}</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Declined</h3>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.declinedQuotes || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{metrics?.expiredQuotes || 0} expired</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Total Value</h3>
            <BarChart3 className="h-4 w-4 text-flowtrade-cyan" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.totalValue || 0)}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-400 text-sm">Draft</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.draft || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400 text-sm">Sent</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.sent || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-400 text-sm">Viewed</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.viewed || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-sm">Accepted</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.accepted || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400 text-sm">Declined</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.declined || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-400 text-sm">Expired</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.expired || 0}</span>
          </div>
        </div>
      </div>

      {/* Quote Volume Trends Chart */}
      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-flowtrade-cyan" />
            Quote Volume Trends
          </h3>
          <p className="text-sm text-gray-400">Daily quote count for {periodLabel.toLowerCase()}</p>
        </div>
        
        {dailyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="quoteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280" 
                fontSize={12}
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f2744',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelFormatter={(value) => format(parseISO(value as string), 'd MMM yyyy')}
                formatter={(value: number) => [value, 'Quotes']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#quoteGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
            <TrendingDown className="h-12 w-12 mb-2 opacity-50" />
            <p>No quote data for this period</p>
          </div>
        )}
      </div>

      {/* Quote Value Trends Chart - Phase 8.4 */}
      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Quote Value Trends
          </h3>
          <p className="text-sm text-gray-400">Daily quote value for {periodLabel.toLowerCase()}</p>
        </div>
        
        {dailyTrends.length > 0 && dailyTrends.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280" 
                fontSize={12}
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis 
                stroke="#6B7280" 
                fontSize={12}
                tickFormatter={(value) => formatCurrencyCompact(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f2744',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelFormatter={(value) => format(parseISO(value as string), 'd MMM yyyy')}
                formatter={(value: number) => [formatCurrency(value), 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#valueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
            <DollarSign className="h-12 w-12 mb-2 opacity-50" />
            <p>No quote value data for this period</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-flowtrade-cyan" />
              Status Distribution
            </h3>
            <p className="text-sm text-gray-400">Breakdown by quote status</p>
          </div>
          
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f2744',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
              <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
              <p>No status data available</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-flowtrade-cyan" />
              Top Customers
            </h3>
            <p className="text-sm text-gray-400">Top 5 by quote value</p>
          </div>
          
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div 
                  key={customer.id}
                  className="flex items-center justify-between p-3 bg-flowtrade-navy/50 rounded-lg border border-flowtrade-navy-lighter"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-flowtrade-cyan/20 text-flowtrade-cyan text-sm font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.quoteCount} quotes</p>
                    </div>
                  </div>
                  <p className="text-white font-semibold">{formatCurrency(customer.totalValue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>No customer data</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-flowtrade-cyan" />
            Recent Quotes
          </h3>
          <p className="text-sm text-gray-400">Last 10 quotes in selected period</p>
        </div>
        
        {quotes.length > 0 ? (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {quotes.slice(0, 10).map((quote) => (
              <div 
                key={quote.id}
                className="flex items-center justify-between p-3 bg-flowtrade-navy/50 rounded-lg border border-flowtrade-navy-lighter hover:border-flowtrade-cyan/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[quote.status] || '#6B7280' }}
                  />
                  <div>
                    <p className="text-white font-medium text-sm">{quote.quote_number}</p>
                    <p className="text-xs text-gray-500">{getCustomerName(quote.customer)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{formatCurrency(quote.total)}</p>
                  <p className="text-xs text-gray-500">{formatDate(quote.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
            <FileText className="h-12 w-12 mb-2 opacity-50" />
            <p>No quotes found</p>
            <p className="text-xs mt-1">Quotes will appear here when created</p>
          </div>
        )}
      </div>
    </div>
  )
}
