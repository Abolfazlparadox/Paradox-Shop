'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import {
  useAdminReviews,
  useModerateReview,
  useRespondToReview,
  useDeleteReview,
  useAdminQuestions,
  useModerateQuestion,
  useAnswerQuestion,
  useDeleteQuestion,
  useAdminReviewReports,
  useResolveReviewReport,
} from '@/hooks/useAdminData';
import { AdminReviewItem, AdminQuestionItem, AdminReviewReportItem, ReviewStatus, QuestionStatus } from '@/types/api';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  Filter,
  MessageSquare,
  HelpCircle,
  Flag,
  Sparkles,
  EyeOff,
  CornerDownRight,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';

function AdminReviewsContent() {
  // Main Section Tabs: Reviews vs Q&A vs Reports
  const [activeQueue, setActiveQueue] = useState<'reviews' | 'questions' | 'reports'>('reviews');

  // Review Filters
  const [reviewStatus, setReviewStatus] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Question Filters
  const [questionStatus, setQuestionStatus] = useState<string>('ALL');
  const [questionSearch, setQuestionSearch] = useState('');

  // Reports Filter
  const [reportStatus, setReportStatus] = useState<string>('PENDING');

  // Queries
  const { data: reviews = [], isLoading: isLoadingReviews } = useAdminReviews({
    status: reviewStatus === 'ALL' ? undefined : reviewStatus,
    rating: ratingFilter || undefined,
    search: searchQuery || undefined,
  });

  const { data: questions = [], isLoading: isLoadingQuestions } = useAdminQuestions({
    status: questionStatus === 'ALL' ? undefined : questionStatus,
    search: questionSearch || undefined,
  });

  const { data: reports = [], isLoading: isLoadingReports } = useAdminReviewReports({
    status: reportStatus === 'ALL' ? undefined : reportStatus,
  });

  // Review Mutations
  const moderateReviewMutation = useModerateReview();
  const respondReviewMutation = useRespondToReview();
  const deleteReviewMutation = useDeleteReview();

  // Question Mutations
  const moderateQuestionMutation = useModerateQuestion();
  const answerQuestionMutation = useAnswerQuestion();
  const deleteQuestionMutation = useDeleteQuestion();

  // Report Mutations
  const resolveReportMutation = useResolveReviewReport();

  // Modal States
  // 1. Reject Modal (for Reviews & Questions)
  const [rejectModalItem, setRejectModalItem] = useState<{ type: 'review' | 'question'; id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 2. Staff Response Modal (for Reviews)
  const [respondReviewItem, setRespondReviewItem] = useState<AdminReviewItem | null>(null);
  const [staffResponseText, setStaffResponseText] = useState('');

  // 3. Staff Answer Modal (for Questions)
  const [answerQuestionItem, setAnswerQuestionItem] = useState<AdminQuestionItem | null>(null);
  const [staffAnswerText, setStaffAnswerText] = useState('');

  // 4. Image Lightbox Modal
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Review Actions
  const handleApproveReview = async (id: string) => {
    try {
      await moderateReviewMutation.mutateAsync({ id, status: 'APPROVED' });
      notify.success('Review Approved', 'Published publicly on product storefront.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Moderation Error', parsed.message);
    }
  };

  const handleHideReview = async (id: string) => {
    try {
      await moderateReviewMutation.mutateAsync({ id, status: 'HIDDEN' });
      notify.success('Review Hidden', 'Removed from public storefront.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Moderation Error', parsed.message);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem) return;

    try {
      if (rejectModalItem.type === 'review') {
        await moderateReviewMutation.mutateAsync({
          id: rejectModalItem.id,
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim() || undefined,
        });
        notify.success('Review Rejected', 'Evaluation rejected with feedback provided to client.');
      } else {
        await moderateQuestionMutation.mutateAsync({
          id: rejectModalItem.id,
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim() || undefined,
        });
        notify.success('Inquiry Rejected', 'Question declined and archived.');
      }
      setRejectModalItem(null);
      setRejectionReason('');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Action Failed', parsed.message);
    }
  };

  const handleConfirmStaffResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondReviewItem || !staffResponseText.trim()) return;

    try {
      await respondReviewMutation.mutateAsync({
        id: respondReviewItem.id,
        response_text: staffResponseText.trim(),
      });
      notify.success('Response Published', 'Official Paradox Atelier response attached to review.');
      setRespondReviewItem(null);
      setStaffResponseText('');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Publishing Error', parsed.message);
    }
  };

  const handleConfirmStaffAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerQuestionItem || !staffAnswerText.trim()) return;

    try {
      await answerQuestionMutation.mutateAsync({
        id: answerQuestionItem.id,
        answer: staffAnswerText.trim(),
      });
      notify.success('Inquiry Answered', 'Official answer published and inquiry approved for storefront.');
      setAnswerQuestionItem(null);
      setStaffAnswerText('');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Answering Error', parsed.message);
    }
  };

  const handleDeleteReview = async (id: string, author: string) => {
    if (confirm(`Permanently delete evaluation by ${author}? This cannot be undone.`)) {
      try {
        await deleteReviewMutation.mutateAsync(id);
        notify.success('Review Deleted', 'Review removed from database.');
      } catch (err: any) {
        const parsed = parseApiError(err, 'generic');
        notify.error('Deletion Failed', parsed.message);
      }
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Permanently delete this product question?')) {
      try {
        await deleteQuestionMutation.mutateAsync(id);
        notify.success('Question Deleted', 'Inquiry removed permanently.');
      } catch (err: any) {
        const parsed = parseApiError(err, 'generic');
        notify.error('Deletion Failed', parsed.message);
      }
    }
  };

  const handleResolveReport = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await resolveReportMutation.mutateAsync({ id, status });
      notify.success('Report Updated', `Report marked as ${status.toLowerCase()}.`);
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Update Failed', parsed.message);
    }
  };

  const getStatusBadge = (status: ReviewStatus | QuestionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Rejected
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Customer Reviews & Q&A Moderation</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Verified purchase evaluations, technical inquiries, staff responses, and community abuse reports
          </p>
        </div>
      </div>

      {/* 2. Top-Level Queue Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveQueue('reviews')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
            activeQueue === 'reviews'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
          )}
        >
          <Star className="w-4 h-4" />
          <span>Client Reviews ({reviews.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveQueue('questions')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
            activeQueue === 'questions'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
          )}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Product Q&A ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveQueue('reports')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
            activeQueue === 'reports'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
          )}
        >
          <Flag className="w-4 h-4" />
          <span>Abuse Reports ({reports.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* QUEUE 1: REVIEWS MODERATION */}
      {/* ============================================================ */}
      {activeQueue === 'reviews' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search review content, product, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
                { id: 'HIDDEN', label: 'Hidden' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setReviewStatus(st.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                    reviewStatus === st.id
                      ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                      : 'text-fg-secondary hover:text-fg-primary'
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
              <button
                onClick={() => setRatingFilter(null)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[11px]',
                  ratingFilter === null
                    ? 'bg-bg-elevated text-cyan-600 dark:text-cyan-400 shadow-sm border border-border-subtle'
                    : 'text-fg-muted hover:text-fg-primary'
                )}
              >
                All ★
              </button>
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter(r)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[11px]',
                    ratingFilter === r
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-fg-muted hover:text-fg-primary'
                  )}
                >
                  {r}★
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
            {isLoadingReviews ? (
              <div className="p-6">
                <SkeletonTable rows={5} />
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-50 text-indigo-500" />
                <p>No client evaluations match the selected criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Artifact</th>
                      <th className="py-3.5 px-4">Rating & Evaluation</th>
                      <th className="py-3.5 px-4">Author & Verification</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Staff Response</th>
                      <th className="py-3.5 px-4 text-end">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                    {reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-bg-secondary/40 transition-colors">
                        {/* Product */}
                        <td className="py-3.5 px-4 font-bold text-fg-primary max-w-[180px]">
                          <div className="truncate">{r.product_name}</div>
                          <div className="text-[10px] text-fg-muted font-mono truncate">/{r.product_slug}</div>
                        </td>

                        {/* Rating & Content */}
                        <td className="py-3.5 px-4 max-w-sm space-y-1.5">
                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'w-3.5 h-3.5',
                                  i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-fg-muted/30'
                                )}
                              />
                            ))}
                            <span className="text-[11px] font-bold text-fg-primary ms-1">{r.rating}.0</span>
                          </div>

                          {r.title && <div className="font-bold text-fg-primary text-xs">{r.title}</div>}
                          <p className="text-[11px] text-fg-secondary line-clamp-3 whitespace-pre-line">
                            {r.body}
                          </p>

                          {/* Pros / Cons preview */}
                          {((r.pros && r.pros.length > 0) || (r.cons && r.cons.length > 0)) && (
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {r.pros?.map((p, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  +{p}
                                </span>
                              ))}
                              {r.cons?.map((c, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  -{c}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Attached Images */}
                          {r.images && r.images.length > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              {r.images.map((img) => (
                                <button
                                  key={img.id}
                                  type="button"
                                  onClick={() => setLightboxImageUrl(img.image)}
                                  className="relative w-8 h-8 rounded border border-border-subtle overflow-hidden hover:border-cyan-500"
                                >
                                  <Image src={img.thumbnail || img.image} alt="Thumbnail" fill className="object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Author */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-fg-primary flex items-center gap-1.5">
                            <span>{r.author_name}</span>
                            {r.is_verified_purchase && (
                              <span title="Verified Delivered Purchase">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-fg-muted truncate max-w-[140px]">{r.author_email}</div>
                          <div className="text-[10px] text-fg-muted mt-1">{formatDate(r.created_at)}</div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(r.status)}
                          {r.status === 'REJECTED' && r.rejection_reason && (
                            <div className="text-[10px] text-rose-400 mt-1 max-w-[120px] truncate" title={r.rejection_reason}>
                              {r.rejection_reason}
                            </div>
                          )}
                        </td>

                        {/* Staff Response */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          {r.staff_response ? (
                            <div className="p-2 rounded bg-bg-secondary border border-cyan-500/30 text-[10px] space-y-0.5">
                              <span className="font-bold text-cyan-400 block">{r.staff_response.staff_name}</span>
                              <p className="text-fg-secondary line-clamp-2">{r.staff_response.response_text}</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-fg-muted">No reply</span>
                          )}
                        </td>

                        {/* Moderation Actions */}
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {r.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveReview(r.id)}
                                className="text-[10px] font-mono px-2 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}

                            {r.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectModalItem({ type: 'review', id: r.id, name: r.author_name });
                                  setRejectionReason('');
                                }}
                                className="text-[10px] font-mono px-2 py-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            )}

                            {r.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleHideReview(r.id)}
                                className="text-[10px] font-mono px-2 py-1 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/10 cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3 mr-1" /> Hide
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRespondReviewItem(r);
                                setStaffResponseText(r.staff_response?.response_text || '');
                              }}
                              className="text-[10px] font-mono px-2 py-1 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 cursor-pointer"
                              title="Respond as Staff"
                            >
                              <CornerDownRight className="w-3 h-3 mr-1" /> Respond
                            </Button>

                            <button
                              onClick={() => handleDeleteReview(r.id, r.author_name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                              title="Delete Review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUEUE 2: PRODUCT Q&A MODERATION */}
      {/* ============================================================ */}
      {activeQueue === 'questions' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search question text, product..."
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].map((st) => (
                <button
                  key={st}
                  onClick={() => setQuestionStatus(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                    questionStatus === st
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-fg-secondary hover:text-fg-primary'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden">
            {isLoadingQuestions ? (
              <div className="p-6">
                <SkeletonTable rows={5} />
              </div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto opacity-50 text-cyan-500" />
                <p>No product inquiries match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Artifact</th>
                      <th className="py-3.5 px-4">Inquiry</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Staff Answer</th>
                      <th className="py-3.5 px-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-fg-primary max-w-[160px]">
                          <div className="truncate">{q.product_name}</div>
                          <div className="text-[10px] text-fg-muted font-mono truncate">/{q.product_slug}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="text-xs text-fg-primary font-medium line-clamp-3 whitespace-pre-line">
                            {q.question}
                          </p>
                          <span className="text-[10px] text-fg-muted block mt-1">{formatDate(q.created_at)}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-fg-primary">{q.author_name}</div>
                          <div className="text-[10px] text-fg-muted">{q.author_email}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(q.status)}
                          {q.status === 'REJECTED' && q.rejection_reason && (
                            <div className="text-[10px] text-rose-400 mt-1 max-w-[120px] truncate" title={q.rejection_reason}>
                              {q.rejection_reason}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-[200px]">
                          {q.answer ? (
                            <div className="p-2 rounded bg-bg-secondary border border-cyan-500/30 text-[10px] space-y-0.5">
                              <span className="font-bold text-cyan-400 block">{q.answer.staff_name}</span>
                              <p className="text-fg-secondary line-clamp-2">{q.answer.answer}</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-semibold">Unanswered</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setAnswerQuestionItem(q);
                                setStaffAnswerText(q.answer?.answer || '');
                              }}
                              className="text-[10px] font-mono px-2.5 py-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer"
                            >
                              <CornerDownRight className="w-3 h-3 mr-1" /> {q.answer ? 'Edit Answer' : 'Answer'}
                            </Button>

                            {q.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moderateQuestionMutation.mutate({ id: q.id, status: 'APPROVED' })}
                                className="text-[10px] font-mono px-2 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}

                            {q.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectModalItem({ type: 'question', id: q.id, name: q.author_name });
                                  setRejectionReason('');
                                }}
                                className="text-[10px] font-mono px-2 py-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            )}

                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUEUE 3: ABUSE REPORTS MODERATION */}
      {/* ============================================================ */}
      {activeQueue === 'reports' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-fg-muted uppercase">Report Status:</span>
              {['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setReportStatus(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer',
                    reportStatus === st
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-fg-secondary hover:text-fg-primary bg-bg-secondary'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden">
            {isLoadingReports ? (
              <div className="p-6">
                <SkeletonTable rows={4} />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
                <Flag className="w-8 h-8 mx-auto opacity-50 text-rose-500" />
                <p>No community abuse reports in this queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Artifact</th>
                      <th className="py-3.5 px-4">Reason & Details</th>
                      <th className="py-3.5 px-4">Reporter</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-end">Resolve Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                    {reports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-fg-primary">
                          {rep.product_name}
                        </td>
                        <td className="py-3.5 px-4 max-w-sm space-y-1">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            {rep.reason}
                          </span>
                          {rep.details && (
                            <p className="text-xs text-fg-secondary italic">{rep.details}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-fg-primary">
                          {rep.reporting_user_email}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              rep.status === 'RESOLVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : rep.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            )}
                          >
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-fg-muted">
                          {formatDate(rep.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {rep.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveReport(rep.id, 'RESOLVED')}
                                  className="text-[10px] font-mono px-2 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveReport(rep.id, 'DISMISSED')}
                                  className="text-[10px] font-mono px-2 py-1 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/10 cursor-pointer"
                                >
                                  Dismiss
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* 1. Reject Modal */}
      <Modal
        isOpen={Boolean(rejectModalItem)}
        onClose={() => setRejectModalItem(null)}
        title={`Decline ${rejectModalItem?.type === 'review' ? 'Review' : 'Question'}`}
        description="Provide constructive feedback explaining why this item was declined."
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Reason for Rejection *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Inappropriate language, commercial advertisement, contains personal identifying details..."
              className="w-full p-2.5 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-rose-500 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRejectModalItem(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Staff Response to Review Modal */}
      <Modal
        isOpen={Boolean(respondReviewItem)}
        onClose={() => setRespondReviewItem(null)}
        title="Compose Official Atelier Response"
        description="This response will be stamped with the Paradox Team badge and published on the review card."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmStaffResponse} className="space-y-4">
          {respondReviewItem && (
            <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs space-y-1">
              <span className="font-bold text-fg-primary">{respondReviewItem.product_name}</span>
              <p className="text-fg-muted line-clamp-2 italic">&ldquo;{respondReviewItem.body}&rdquo;</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Official Response Text *
            </label>
            <textarea
              rows={4}
              value={staffResponseText}
              onChange={(e) => setStaffResponseText(e.target.value)}
              placeholder="Thank the client for their appraisal or provide technical resolution..."
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-cyan-500 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRespondReviewItem(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold"
            >
              Publish Atelier Response
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Staff Answer to Question Modal */}
      <Modal
        isOpen={Boolean(answerQuestionItem)}
        onClose={() => setAnswerQuestionItem(null)}
        title="Publish Authoritative Technical Answer"
        description="Providing an answer automatically approves the inquiry and publishes it publicly on the storefront."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmStaffAnswer} className="space-y-4">
          {answerQuestionItem && (
            <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs space-y-1">
              <span className="font-bold text-fg-primary">{answerQuestionItem.product_name}</span>
              <p className="text-fg-primary font-medium">{answerQuestionItem.question}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Authoritative Staff Answer *
            </label>
            <textarea
              rows={4}
              value={staffAnswerText}
              onChange={(e) => setStaffAnswerText(e.target.value)}
              placeholder="Provide exact material dimensions, compatibility notes, or operational guidelines..."
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-cyan-500 focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAnswerQuestionItem(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold"
            >
              Publish Answer & Approve
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Lightbox Preview Modal */}
      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-5 end-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-20"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full max-w-3xl h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={lightboxImageUrl} alt="Review full attachment" fill className="object-contain" priority />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} />}>
      <AdminReviewsContent />
    </Suspense>
  );
}
