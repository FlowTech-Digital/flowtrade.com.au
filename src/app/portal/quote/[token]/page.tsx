'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { TokenExpiredView } from '@/components/portal/TokenExpiredView';
import { QuotePortalView } from '@/components/portal/QuotePortalView';
import { Loader2 } from 'lucide-react';

interface QuoteData {
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
}

export default function QuotePortalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuoteData | null>(null);
  const [actionResult, setActionResult] = useState<'accepted' | 'declined' | null>(null);

  // Check for action result from URL
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'accepted' || action === 'declined') {
      setActionResult(action);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/portal/quotes/${token}`);
        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error || 'Failed to load quote');
          return;
        }
        
        setData(result);
      } catch {
        setError('Failed to load quote');
      } finally {
        setLoading(false);
      }
    }
    
    fetchQuote();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <TokenExpiredView error={error} type="quote" />;
  }

  if (!data) {
    return <TokenExpiredView error="not_found" type="quote" />;
  }

  return (
    <PortalLayout organization={data.organization}>
      <QuotePortalView 
        quote={data.quote}
        customer={data.customer}
        organization={data.organization}
        token={token}
        actionResult={actionResult}
      />
    </PortalLayout>
  );
}
