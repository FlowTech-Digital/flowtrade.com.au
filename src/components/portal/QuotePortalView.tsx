'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Download, FileText, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuoteAcceptModal } from './QuoteAcceptModal';
import { QuoteDeclineModal } from './QuoteDeclineModal';

interface QuotePortalViewProps {
  quote: {
    id: string;
    quote_number: string;
    status: string;
    issue_date: string;
    valid_until: string;
    subtotal: number;
    gst: number;
    total: number;
    notes: string | null;
    terms: string | null;
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
  token: string;
  actionResult: 'accepted' | 'declined' | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Awaiting Response', variant: 'default', color: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Accepted', variant: 'default', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Declined', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
  converted: { label: 'Converted to Job', variant: 'default', color: 'bg-purple-100 text-purple-800' },
};

export function QuotePortalView({ quote, customer, organization, token, actionResult }: QuotePortalViewProps) {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(quote.status);

  const status = statusConfig[currentStatus] || statusConfig.draft;
  const isExpired = new Date(quote.valid_until) < new Date();
  const canRespond = (currentStatus === 'sent' || currentStatus === 'draft') && !isExpired;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const handleAccepted = () => {
    setCurrentStatus('accepted');
    setShowAcceptModal(false);
  };

  const handleDeclined = () => {
    setCurrentStatus('declined');
    setShowDeclineModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Result Banner */}
      {actionResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          actionResult === 'accepted' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {actionResult === 'accepted' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={actionResult === 'accepted' ? 'text-green-800' : 'text-red-800'}>
            {actionResult === 'accepted' 
              ? `Quote accepted! ${organization.name} will be in touch soon.`
              : 'Quote declined. Thank you for letting us know.'}
          </span>
        </div>
      )}

      {/* Quote Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                Quote {quote.quote_number}
              </CardTitle>
              <p className="text-gray-500 mt-1">From {organization.name}</p>
            </div>
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Issue Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(quote.issue_date), 'dd MMM yyyy')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Valid Until</p>
              <p className={`font-medium flex items-center gap-1 ${isExpired ? 'text-red-600' : ''}`}>
                <Clock className="h-4 w-4" />
                {format(new Date(quote.valid_until), 'dd MMM yyyy')}
                {isExpired && ' (Expired)'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Prepared For</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold text-lg text-blue-600">{formatCurrency(quote.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
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
                {quote.items.map((item) => (
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
                  <td className="py-3 text-right font-medium">{formatCurrency(quote.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-500">GST (10%)</td>
                  <td className="py-1 text-right">{formatCurrency(quote.gst)}</td>
                </tr>
                <tr className="text-lg">
                  <td colSpan={3} className="py-3 text-right font-semibold">Total (AUD)</td>
                  <td className="py-3 text-right font-bold text-blue-600">{formatCurrency(quote.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      {(quote.notes || quote.terms) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {quote.notes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Terms & Conditions</h4>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{quote.terms}</p>
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
              onClick={() => window.open(`/api/portal/quotes/${token}/pdf`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            
            {canRespond && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeclineModal(true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline Quote
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Quote
                </Button>
              </div>
            )}

            {!canRespond && currentStatus !== 'accepted' && currentStatus !== 'declined' && (
              <p className="text-gray-500 text-sm">
                {isExpired ? 'This quote has expired' : 'This quote is no longer available for response'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <div className="text-center text-gray-500 text-sm">
        <p>Questions about this quote?</p>
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

      {/* Modals */}
      <QuoteAcceptModal
        open={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onAccepted={handleAccepted}
        token={token}
        total={quote.total}
        organizationName={organization.name}
      />
      
      <QuoteDeclineModal
        open={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        onDeclined={handleDeclined}
        token={token}
      />
    </div>
  );
}
