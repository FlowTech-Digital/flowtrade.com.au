'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileText, Calendar, Clock, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentButton } from './PaymentButton';

interface Payment {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface InvoicePortalViewProps {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string;
    subtotal: number;
    gst: number;
    total: number;
    notes: string | null;
    terms: string | null;
    paid_at: string | null;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  };
  customer: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    abn: string | null;
  };
  payments: Payment[];
  token: string;
  paymentResult: 'success' | 'cancelled' | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-800' },
  viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  void: { label: 'Void', color: 'bg-gray-100 text-gray-800' },
};

export function InvoicePortalView({ 
  invoice, 
  customer, 
  organization, 
  payments,
  token, 
  paymentResult 
}: InvoicePortalViewProps) {
  const [currentStatus] = useState(invoice.status);

  const status = statusConfig[currentStatus] || statusConfig.draft;
  const isOverdue = new Date(invoice.due_date) < new Date() && currentStatus !== 'paid';
  const displayStatus = isOverdue && currentStatus !== 'paid' ? 'overdue' : currentStatus;
  const canPay = ['sent', 'viewed', 'overdue'].includes(currentStatus) || (isOverdue && currentStatus !== 'paid');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const getDueDateColor = () => {
    if (currentStatus === 'paid') return 'text-green-600';
    if (isOverdue) return 'text-red-600';
    const daysUntilDue = Math.ceil((new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 7) return 'text-orange-600';
    return '';
  };

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Payment Result Banner */}
      {paymentResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          paymentResult === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {paymentResult === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <span className={paymentResult === 'success' ? 'text-green-800' : 'text-yellow-800'}>
            {paymentResult === 'success' 
              ? 'Payment successful! Thank you for your payment.'
              : 'Payment was cancelled. You can try again when ready.'}
          </span>
        </div>
      )}

      {/* Invoice Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                Invoice {invoice.invoice_number}
              </CardTitle>
              <p className="text-gray-500 mt-1">From {organization.name}</p>
            </div>
            <Badge className={statusConfig[displayStatus]?.color || status.color}>
              {statusConfig[displayStatus]?.label || status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Issue Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(invoice.issue_date), 'dd MMM yyyy')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className={`font-medium flex items-center gap-1 ${getDueDateColor()}`}>
                <Clock className="h-4 w-4" />
                {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                {isOverdue && currentStatus !== 'paid' && ' (Overdue)'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Bill To</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Amount Due</p>
              <p className="font-semibold text-lg text-blue-600">
                {currentStatus === 'paid' ? formatCurrency(0) : formatCurrency(invoice.total - totalPaid)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Qty</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="py-3 text-right text-gray-500">Subtotal</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-500">GST (10%)</td>
                  <td className="py-1 text-right">{formatCurrency(invoice.gst)}</td>
                </tr>
                <tr className="text-lg">
                  <td colSpan={3} className="py-3 text-right font-semibold">Total (AUD)</td>
                  <td className="py-3 text-right font-bold text-blue-600">{formatCurrency(invoice.total)}</td>
                </tr>
                {totalPaid > 0 && (
                  <>
                    <tr className="text-green-600">
                      <td colSpan={3} className="py-1 text-right">Paid</td>
                      <td className="py-1 text-right">-{formatCurrency(totalPaid)}</td>
                    </tr>
                    <tr className="text-lg border-t">
                      <td colSpan={3} className="py-3 text-right font-semibold">Balance Due</td>
                      <td className="py-3 text-right font-bold text-blue-600">
                        {formatCurrency(invoice.total - totalPaid)}
                      </td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {completedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {payment.paid_at ? format(new Date(payment.paid_at), 'dd MMM yyyy HH:mm') : 'Pending'}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Terms */}
      {(invoice.notes || invoice.terms) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {invoice.notes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Terms & Conditions</h4>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/portal/invoices/${token}/pdf`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            
            {canPay && (
              <PaymentButton 
                token={token}
                amount={invoice.total - totalPaid}
                invoiceNumber={invoice.invoice_number}
              />
            )}

            {currentStatus === 'paid' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Paid in Full</span>
                {invoice.paid_at && (
                  <span className="text-sm text-gray-500">
                    on {format(new Date(invoice.paid_at), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <div className="text-center text-gray-500 text-sm">
        <p>Questions about this invoice?</p>
        <p>
          Contact {organization.name}
          {organization.email && (
            <> at <a href={`mailto:${organization.email}`} className="text-blue-600 hover:underline">{organization.email}</a></>
          )}
          {organization.phone && (
            <> or call <a href={`tel:${organization.phone}`} className="text-blue-600 hover:underline">{organization.phone}</a></>
          )}
        </p>
      </div>
    </div>
  );
}
