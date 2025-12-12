'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { TokenExpiredView } from '@/components/portal/TokenExpiredView';
import { InvoicePortalView } from '@/components/portal/InvoicePortalView';
import { Loader2 } from 'lucide-react';

type ErrorType = 'expired' | 'revoked' | 'not_found' | 'invalid';

interface InvoiceData {
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
  payments: Array<{
    id: string;
    amount: number;
    payment_method: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
}

export default function InvoicePortalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType | null>(null);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [paymentResult, setPaymentResult] = useState<'success' | 'cancelled' | null>(null);

  // Check for payment result from URL
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') setPaymentResult('success');
    if (payment === 'cancelled') setPaymentResult('cancelled');
  }, [searchParams]);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/portal/invoices/${token}`);
        const result = await response.json();
        
        if (!response.ok) {
          // Map API error to ErrorType
          const errorType = result.error as ErrorType;
          if (['expired', 'revoked', 'not_found', 'invalid'].includes(errorType)) {
            setError(errorType);
          } else {
            setError('invalid');
          }
          return;
        }
        
        setData(result);
      } catch {
        setError('invalid');
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvoice();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <PortalLayout>
        <TokenExpiredView errorType={error} />
      </PortalLayout>
    );
  }

  if (!data) {
    return (
      <PortalLayout>
        <TokenExpiredView errorType="not_found" />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout organization={data.organization}>
      <InvoicePortalView 
        invoice={data.invoice}
        customer={data.customer}
        organization={data.organization}
        payments={data.payments}
        token={token}
        paymentResult={paymentResult}
      />
    </PortalLayout>
  );
}
