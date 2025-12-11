'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface QuoteDeclineModalProps {
  open: boolean;
  onClose: () => void;
  onDeclined: () => void;
  token: string;
}

export function QuoteDeclineModal({ 
  open, 
  onClose, 
  onDeclined, 
  token 
}: QuoteDeclineModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleDecline = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal/quotes/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to decline quote');
      }

      onDeclined();
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
            <X className="h-5 w-5 text-red-600" />
            Decline Quote
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to decline this quote?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for declining (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Help us understand why this quote doesn't work for you..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your feedback helps us improve our quotes.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDecline} 
            disabled={loading}
            variant="destructive"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Declining...</>
            ) : (
              <><X className="h-4 w-4 mr-2" /> Decline Quote</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
