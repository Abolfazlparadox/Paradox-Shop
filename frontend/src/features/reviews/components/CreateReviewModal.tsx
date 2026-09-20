'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateReview } from '../queries/useCreateReview';
import { Star, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export function CreateReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
}: CreateReviewModalProps) {
  const createMutation = useCreateReview();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClose = () => {
    setTitle('');
    setBody('');
    setRating(5);
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to submit review.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.review) {
          msg = Array.isArray(data.review) ? data.review[0] : String(data.review);
        } else if (data.product_id) {
          msg = Array.isArray(data.product_id) ? data.product_id[0] : String(data.product_id);
        } else if (data.rating) {
          msg = Array.isArray(data.rating) ? data.rating[0] : String(data.rating);
        } else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        } else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const firstVal = data[firstKey];
          msg = Array.isArray(firstVal) ? `${firstVal[0]}` : String(firstVal);
        }
      }
      setErrorMessage(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Verified Client Evaluation"
      description={`Reviewing artifact: ${productName}`}
      maxWidth="md"
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-fg-primary">
              Review Submitted Successfully
            </h3>
            <p className="text-xs text-fg-secondary max-w-sm mx-auto">
              Your verified evaluation has been received and is pending moderation approval before public display.
            </p>
          </div>
          <Button size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2.5 text-status-error text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="space-y-1.5 text-center sm:text-start">
            <label className="block text-xs font-mono uppercase tracking-wider text-fg-primary font-medium">
              Artifact Rating (Required)
            </label>
            <div className="flex items-center justify-center sm:justify-start gap-1 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform focus-ring rounded-sm cursor-pointer"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 transition-colors',
                        active ? 'fill-current' : 'text-fg-muted opacity-30'
                      )}
                    />
                  </button>
                );
              })}
              <span className="ms-2 text-xs font-mono font-semibold text-fg-primary">
                {rating} / 5
              </span>
            </div>
          </div>

          <Input
            label="Evaluation Headline (Optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Exceptional tolerance and finish"
            className="text-xs h-9"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-fg-primary font-medium">
              Detailed Impressions (Optional)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe material feel, tactile feedback, precision, or performance..."
              rows={4}
              className="w-full px-3 py-2 text-xs rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
            <span className="flex items-center gap-1 text-[11px] font-mono text-fg-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Purchase Review
            </span>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                Submit Evaluation
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
