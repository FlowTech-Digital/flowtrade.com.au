'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface QuoteAcceptModalProps {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  token: string;
  total: number;
  organizationName: string;
}

export function QuoteAcceptModal({ 
  open, 
  onClose, 
  onAccepted, 
  token, 
  total,
  organizationName 
}: QuoteAcceptModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal/quotes/${token}/accept`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to accept quote');
      }

      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Accept Quote
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to accept this quote?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Quote Total</span>
              <span className="font-semibold text-lg">{formatCurrency(total)}</span>
            </div>
            <p className="text-sm text-gray-500">
              By accepting, you agree to proceed with {organizationName} for the services outlined in this quote.
            </p>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting...</>
            ) : (
              <><Check className="h-4 w-4 mr-2" /> Accept Quote</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
