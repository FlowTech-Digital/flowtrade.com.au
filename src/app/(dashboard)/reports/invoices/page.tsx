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
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
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

type Invoice = {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  gst_amount: number
  total: number
  issue_date: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  notes: string | null
  customer_id: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
}

type InvoiceMetrics = {
  totalInvoices: number
  totalValue: number
  paidValue: number
  outstandingValue: number
  overdueCount: number
  collectionRate: number
  avgInvoiceValue: number
  statusBreakdown: {
    draft: number
    sent: number
    paid: number
    overdue: number
    cancelled: number
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
  invoiceCount: number
  totalValue: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  paid: '#10B981',
  overdue: '#EF4444',
  cancelled: '#F97316',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export default function InvoicesReportPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [metrics, setMetrics] = useState<InvoiceMetrics | null>(null)
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

  const getCustomerName = (customer: Invoice['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  const calculateMetrics = useCallback((invoicesData: Invoice[]): InvoiceMetrics => {
    const statusBreakdown = {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    }

    let totalValue = 0
    let paidValue = 0

    invoicesData.forEach(invoice => {
      const status = invoice.status as keyof typeof statusBreakdown
      if (status in statusBreakdown) {
        statusBreakdown[status]++
      }
      totalValue += invoice.total || 0
      if (status === 'paid') {
        paidValue += invoice.total || 0
      }
    })

    const totalInvoices = invoicesData.length
    const outstandingValue = totalValue - paidValue - invoicesData
      .filter(inv => inv.status === 'cancelled' || inv.status === 'draft')
      .reduce((sum, inv) => sum + (inv.total || 0), 0)
    
    const overdueCount = statusBreakdown.overdue
    
    // Collection rate: paid / (paid + overdue + sent) * 100
    const billableInvoices = statusBreakdown.paid + statusBreakdown.overdue + statusBreakdown.sent
    const collectionRate = billableInvoices > 0 
      ? Math.round((statusBreakdown.paid / billableInvoices) * 100) 
      : 0

    const avgInvoiceValue = totalInvoices > 0 ? totalValue / totalInvoices : 0

    return {
      totalInvoices,
      totalValue,
      paidValue,
      outstandingValue,
      overdueCount,
      collectionRate,
      avgInvoiceValue,
      statusBreakdown,
    }
  }, [])

  const calculateDailyTrends = useCallback((invoicesData: Invoice[], from: Date, to: Date): DailyTrend[] => {
    const days = eachDayOfInterval({ start: from, end: to })
    
    const dailyData = days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const dayInvoices = invoicesData.filter(invoice => {
        const invoiceDate = parseISO(invoice.created_at)
        return invoiceDate >= dayStart && invoiceDate <= dayEnd
      })

      return {
        date: format(day, 'yyyy-MM-dd'),
        count: dayInvoices.length,
        value: dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
      }
    })

    return dailyData
  }, [])

  const calculateTopCustomers = useCallback((invoicesData: Invoice[]): TopCustomer[] => {
    const customerMap = new Map<string, { name: string; invoiceCount: number; totalValue: number }>()

    invoicesData.forEach(invoice => {
      if (!invoice.customer_id) return
      
      const existing = customerMap.get(invoice.customer_id)
      const customerName = getCustomerName(invoice.customer)
      
      if (existing) {
        existing.invoiceCount++
        existing.totalValue += invoice.total || 0
      } else {
        customerMap.set(invoice.customer_id, {
          name: customerName,
          invoiceCount: 1,
          totalValue: invoice.total || 0,
        })
      }
    })

    return Array.from(customerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  }, [])

  const fetchInvoiceData = useCallback(async () => {
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

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          status,
          subtotal,
          gst_amount,
          total,
          issue_date,
          due_date,
          paid_at,
          created_at,
          notes,
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

      if (invoicesError) {
        console.error('Failed to fetch invoices:', invoicesError)
      } else {
        const invoices = invoicesData || []
        setInvoices(invoices)
        setMetrics(calculateMetrics(invoices))
        setDailyTrends(calculateDailyTrends(invoices, dateRange.from, dateRange.to))
        setTopCustomers(calculateTopCustomers(invoices))
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error)
    }

    setRefreshing(false)
    setLoading(false)
  }, [user, dateRange, calculateMetrics, calculateDailyTrends, calculateTopCustomers])

  useEffect(() => {
    fetchInvoiceData()
  }, [fetchInvoiceData])

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
    if (invoices.length === 0) return

    setExporting('csv')

    try {
      const headers = ['Invoice Number', 'Customer', 'Status', 'Total', 'Issue Date', 'Due Date', 'Paid At', 'Created At']
      const rows = invoices.map(invoice => [
        invoice.invoice_number,
        getCustomerName(invoice.customer),
        invoice.status,
        invoice.total?.toString() || '0',
        invoice.issue_date || '',
        invoice.due_date || '',
        invoice.paid_at || '',
        invoice.created_at,
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
      a.download = `invoices-report-${dateStr}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export error:', error)
    } finally {
      setExporting(null)
    }
  }, [invoices, dateRange])

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
          <title>FlowTrade Invoices Report - ${periodLabel}</title>
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
            .status-paid { color: #10B981; font-weight: 500; }
            .status-overdue { color: #EF4444; font-weight: 500; }
            .status-cancelled { color: #F97316; }
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
              grid-template-columns: repeat(5, 1fr);
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
            <div class="report-title">Invoice Analytics Report</div>
            <div class="report-meta">
              Period: ${periodLabel}
              <br>Generated: ${reportDate}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Invoices</div>
              <div class="metric-value">${metrics.totalInvoices}</div>
              <div class="metric-sub">${periodLabel.toLowerCase()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Collection Rate</div>
              <div class="metric-value">${metrics.collectionRate}%</div>
              <div class="metric-sub">${metrics.statusBreakdown.paid} paid of ${metrics.statusBreakdown.paid + metrics.statusBreakdown.sent + metrics.statusBreakdown.overdue} billable</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Value</div>
              <div class="metric-value">${formatCurrency(metrics.totalValue)}</div>
              <div class="metric-sub">All invoices in period</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Paid Value</div>
              <div class="metric-value">${formatCurrency(metrics.paidValue)}</div>
              <div class="metric-sub">Collected payments</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Outstanding</div>
              <div class="metric-value">${formatCurrency(metrics.outstandingValue)}</div>
              <div class="metric-sub">Sent + Overdue</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Overdue</div>
              <div class="metric-value">${metrics.overdueCount}</div>
              <div class="metric-sub">Requires follow-up</div>
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
                <div class="summary-count green">${metrics.statusBreakdown.paid}</div>
                <div class="summary-label">Paid</div>
              </div>
              <div class="summary-item">
                <div class="summary-count red">${metrics.statusBreakdown.overdue}</div>
                <div class="summary-label">Overdue</div>
              </div>
              <div class="summary-item">
                <div class="summary-count orange">${metrics.statusBreakdown.cancelled}</div>
                <div class="summary-label">Cancelled</div>
              </div>
            </div>
          </div>

          ${topCustomers.length > 0 ? `
          <div class="section">
            <div class="section-title">Top Customers by Invoice Value</div>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer</th>
                  <th>Invoices</th>
                  <th style="text-align: right;">Total Value</th>
                </tr>
              </thead>
              <tbody>
                ${topCustomers.map((c, i) => `
                  <tr>
                    <td>#${i + 1}</td>
                    <td>${c.name}</td>
                    <td>${c.invoiceCount}</td>
                    <td class="amount">${formatCurrency(c.totalValue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Recent Invoices (Last 20)</div>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style="text-align: right;">Value</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.slice(0, 20).map(inv => `
                  <tr>
                    <td>${inv.invoice_number}</td>
                    <td>${getCustomerName(inv.customer)}</td>
                    <td class="status-${inv.status}">${STATUS_LABELS[inv.status] || inv.status}</td>
                    <td>${formatDateFull(inv.created_at)}</td>
                    <td class="amount">${formatCurrency(inv.total)}</td>
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
  }, [metrics, invoices, topCustomers, periodLabel])

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
            Invoice Analytics
          </h1>
          <p className="text-gray-400 hidden sm:block">Track invoice performance and collection metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r border-flowtrade-navy-lighter pr-3">
            <button
              onClick={exportToCSV}
              disabled={exporting !== null || invoices.length === 0}
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
            onClick={fetchInvoiceData}
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

      {/* Metrics Cards - 6 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Total Invoices</h3>
            <FileText className="h-4 w-4 text-flowtrade-cyan" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.totalInvoices || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Total Value</h3>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.totalValue || 0)}</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Paid</h3>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.paidValue || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">{metrics?.statusBreakdown.paid || 0} invoices</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Outstanding</h3>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.outstandingValue || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Sent + Overdue</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Overdue</h3>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.overdueCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Needs follow-up</p>
        </div>

        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">Collection Rate</h3>
            <TrendingUp className="h-4 w-4 text-flowtrade-cyan" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.collectionRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Paid / Billable</p>
        </div>
      </div>

      {/* Status Breakdown Bar */}
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
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-400 text-sm">Paid</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.paid || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-400 text-sm">Overdue</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.overdue || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-400 text-sm">Cancelled</span>
            <span className="text-white font-semibold">{metrics?.statusBreakdown.cancelled || 0}</span>
          </div>
        </div>
      </div>

      {/* Invoice Volume Trends Chart */}
      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-flowtrade-cyan" />
            Invoice Volume Trends
          </h3>
          <p className="text-sm text-gray-400">Daily invoice count for {periodLabel.toLowerCase()}</p>
        </div>
        
        {dailyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="invoiceGradient" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value: number) => [value, 'Invoices']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#invoiceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
            <TrendingDown className="h-12 w-12 mb-2 opacity-50" />
            <p>No invoice data for this period</p>
          </div>
        )}
      </div>

      {/* Invoice Value Trends Chart */}
      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Invoice Value Trends
          </h3>
          <p className="text-sm text-gray-400">Daily invoice value for {periodLabel.toLowerCase()}</p>
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
            <p>No invoice value data for this period</p>
          </div>
        )}
      </div>

      {/* Status Pie + Top Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-flowtrade-cyan" />
              Status Distribution
            </h3>
            <p className="text-sm text-gray-400">Breakdown by invoice status</p>
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
            <p className="text-sm text-gray-400">Top 5 by invoice value</p>
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
                      <p className="text-xs text-gray-500">{customer.invoiceCount} invoices</p>
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

      {/* Recent Invoices Table */}
      <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border border-flowtrade-navy-lighter rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-flowtrade-cyan" />
            Recent Invoices
          </h3>
          <p className="text-sm text-gray-400">Last 10 invoices in selected period</p>
        </div>
        
        {invoices.length > 0 ? (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {invoices.slice(0, 10).map((invoice) => (
              <div 
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-flowtrade-navy/50 rounded-lg border border-flowtrade-navy-lighter hover:border-flowtrade-cyan/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[invoice.status] || '#6B7280' }}
                  />
                  <div>
                    <p className="text-white font-medium text-sm">{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500">{getCustomerName(invoice.customer)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{formatCurrency(invoice.total)}</p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
            <FileText className="h-12 w-12 mb-2 opacity-50" />
            <p>No invoices found</p>
            <p className="text-xs mt-1">Invoices will appear here when created</p>
          </div>
        )}
      </div>
    </div>
  )
}
