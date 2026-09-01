'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import {
  useProductQuestions,
  useCreateProductQuestion,
  useReportProductQuestion,
} from '../queries/useProductQuestions';
import { ProductQuestion } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import { formatDate } from '@/lib/utils/format';
import {
  HelpCircle,
  Sparkles,
  Send,
  Flag,
  Lock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ProductQAProps {
  productId: string;
  className?: string;
}

export function ProductQA({ productId, className }: ProductQAProps) {
  const { isAuthenticated } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { data: questionsData, isLoading } = useProductQuestions(productId, {
    page: currentPage,
    page_size: 10,
  });
  const createQuestionMutation = useCreateProductQuestion(productId);
  const reportMutation = useReportProductQuestion();

  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedQuestionForReport, setSelectedQuestionForReport] = useState<ProductQuestion | null>(null);
  const [reportReason, setReportReason] = useState<string>('SPAM');
  const [reportDetails, setReportDetails] = useState('');

  const questions = questionsData?.results || [];

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || questionText.trim().length < 5) {
      setFormError('Question must be at least 5 characters.');
      return;
    }

    setFormError(null);

    try {
      await createQuestionMutation.mutateAsync({
        product_id: productId,
        question: questionText.trim(),
      });
      setIsAskModalOpen(false);
      setQuestionText('');
      notify.success(
        'Inquiry Submitted',
        'Your question has been forwarded to our atelier specialists for review and response.'
      );
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      setFormError(parsed.message);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionForReport) return;

    try {
      await reportMutation.mutateAsync({
        id: selectedQuestionForReport.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setIsReportModalOpen(false);
      setSelectedQuestionForReport(null);
      setReportDetails('');
      notify.success('Report Filed', 'Thank you for helping keep our atelier community helpful and respectful.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Report Failed', parsed.message);
    }
  };

  return (
    <section className={cn('space-y-6 pt-10 border-t border-border-subtle text-start', className)}>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-fg-primary flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-accent" />
            Product Inquiries & Q&A
          </h3>
          <p className="text-xs text-fg-secondary font-mono mt-1">
            Technical specifications, material dimensions & verified atelier answers
          </p>
        </div>

        {/* Ask Question Action */}
        <div>
          {!isAuthenticated ? (
            <Link href={`/login?redirect=/products/${productId}`}>
              <Button size="sm" variant="outline" className="text-xs font-mono">
                <Lock className="w-3.5 h-3.5 me-1.5" />
                Sign In to Ask
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAskModalOpen(true)}
              className="text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5 me-1.5 text-accent" />
              Ask an Atelier Specialist
            </Button>
          )}
        </div>
      </div>

      {/* 2. Loading & Empty State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-muted space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-xs font-mono">Loading product inquiries...</span>
        </div>
      )}

      {!isLoading && questions.length === 0 && (
        <div className="p-8 rounded-2xl bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted border border-border-subtle mb-1">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold font-display text-fg-primary">
            No Questions Asked Yet
          </h4>
          <p className="text-xs text-fg-secondary max-w-sm">
            Have a question about materials, compatibility, or sizing? Ask our technical team directly.
          </p>
          {isAuthenticated && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAskModalOpen(true)}
              className="text-xs mt-2"
            >
              Ask the First Question
            </Button>
          )}
        </div>
      )}

      {/* 3. Questions List */}
      {!isLoading && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 shadow-card space-y-4 transition-all hover:border-border-accent/40"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-[10px] font-mono font-bold text-fg-primary">
                    {q.user_display_name ? q.user_display_name.slice(0, 2).toUpperCase() : 'PX'}
                  </div>
                  <div>
                    <span className="text-xs font-bold font-display text-fg-primary block">
                      {q.user_display_name || 'Anonymous Client'}
                    </span>
                    <span className="text-[10px] font-mono text-fg-muted">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuestionForReport(q);
                    setIsReportModalOpen(true);
                  }}
                  className="text-fg-muted hover:text-rose-400 transition-colors p-1 rounded inline-flex items-center gap-1 text-[11px] font-mono"
                >
                  <Flag className="w-3 h-3" />
                  <span>Report</span>
                </button>
              </div>

              {/* Question Text */}
              <p className="text-xs text-fg-primary font-medium leading-relaxed ps-9 whitespace-pre-line">
                {q.question}
              </p>

              {/* Official Staff Answer */}
              {q.answer ? (
                <div className="ms-6 sm:ms-9 p-4 rounded-xl bg-bg-secondary/90 border border-border-accent/40 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 start-0 bottom-0 w-1 bg-accent" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-accent-fg uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      Answered by {q.answer.staff_name || 'Paradox Atelier Team'}
                    </span>
                    <span className="text-[10px] font-mono text-fg-muted">
                      {formatDate(q.answer.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-fg-primary leading-relaxed whitespace-pre-line ps-1">
                    {q.answer.answer}
                  </p>
                </div>
              ) : (
                <div className="ms-6 sm:ms-9 p-3 rounded-lg bg-bg-secondary/50 border border-border-subtle/60 flex items-center gap-2 text-[11px] font-mono text-fg-muted">
                  <Info className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Awaiting atelier technical verification and staff response.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Ask Question Modal */}
      <Modal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        title="Ask an Atelier Specialist"
        description="Submit technical inquiries regarding dimensions, material tolerances, or dispatch details."
        maxWidth="md"
      >
        <form onSubmit={handleAskSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
                Your Inquiry *
              </label>
              <span className="text-[10px] font-mono text-fg-muted">{questionText.length} / 1000</span>
            </div>
            <textarea
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Is this item treated for salt-water exposure? What is the exact internal sleeve diameter?"
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle flex items-start gap-2.5 text-[11px] text-fg-secondary font-mono">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              Approved technical questions and authoritative staff answers become publicly visible on this artifact page.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAskModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={createQuestionMutation.isPending}
              disabled={createQuestionMutation.isPending || !questionText.trim()}
              className="text-xs font-semibold"
            >
              Submit Inquiry
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Abuse Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Inquiry"
        description="Notify the moderation team of irrelevant, promotional, or abusive questions."
        maxWidth="sm"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Reason *
            </label>
            <div className="space-y-1.5">
              {[
                { key: 'SPAM', label: 'Commercial spam or advertising' },
                { key: 'OFFENSIVE', label: 'Inappropriate or abusive language' },
                { key: 'IRRELEVANT', label: 'Irrelevant to this artifact' },
                { key: 'OTHER', label: 'Other violation' },
              ].map((r) => (
                <label
                  key={r.key}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                    reportReason === r.key
                      ? 'bg-accent/10 border-accent text-fg-primary font-semibold'
                      : 'bg-bg-secondary border-border-subtle text-fg-secondary hover:bg-bg-elevated'
                  )}
                >
                  <input
                    type="radio"
                    name="qReportReason"
                    value={r.key}
                    checked={reportReason === r.key}
                    onChange={() => setReportReason(r.key)}
                    className="text-accent focus:ring-accent"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Details (Optional)
            </label>
            <textarea
              rows={2}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Optional notes for the moderation team..."
              className="w-full p-2.5 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReportModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={reportMutation.isPending}
              disabled={reportMutation.isPending}
              className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
