'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, questionsApi } from '@/lib/api/endpoints';
import { UserReview, UserProductQuestion, ReviewStatus, QuestionStatus } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import { formatDate } from '@/lib/utils/format';
import {
  Star,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function DashboardReviewsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reviews' | 'questions'>('reviews');

  // Query: My Reviews
  const {
    data: myReviewsData,
    isLoading: isLoadingReviews,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['myReviews'],
    queryFn: () => reviewsApi.getMyReviews(),
    staleTime: 30 * 1000,
  });

  // Query: My Questions
  const {
    data: myQuestionsData,
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ['myQuestions'],
    queryFn: () => questionsApi.getMyQuestions(),
    staleTime: 30 * 1000,
  });

  // Delete Mutations
  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      notify.success('Review Deleted', 'Your review evaluation has been permanently removed.');
    },
    onError: (err: any) => {
      const parsed = parseApiError(err, 'generic');
      notify.error('Delete Failed', parsed.message);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myQuestions'] });
      notify.success('Question Deleted', 'Your product inquiry has been removed.');
    },
    onError: (err: any) => {
      const parsed = parseApiError(err, 'generic');
      notify.error('Delete Failed', parsed.message);
    },
  });

  // Edit Review Modal State
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editPros, setEditPros] = useState<string[]>([]);
  const [editProInput, setEditProInput] = useState('');
  const [editCons, setEditCons] = useState<string[]>([]);
  const [editConInput, setEditConInput] = useState('');
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => reviewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      setEditingReview(null);
      notify.success(
        'Review Updated',
        'Your edits have been saved and forwarded to moderation.'
      );
    },
    onError: (err: any) => {
      const parsed = parseApiError(err, 'generic');
      setEditFormError(parsed.message);
    },
  });

  const openEditModal = (rev: UserReview) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditTitle(rev.title || '');
    setEditBody(rev.body || '');
    setEditPros(rev.pros || []);
    setEditCons(rev.cons || []);
    setEditFormError(null);
  };

  const handleSaveEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    if (!editRating || editRating < 1 || editRating > 5) {
      setEditFormError('Rating must be between 1 and 5 stars.');
      return;
    }
    if (!editBody.trim() || editBody.trim().length < 5) {
      setEditFormError('Evaluation must be at least 5 characters.');
      return;
    }

    setEditFormError(null);

    const formData = new FormData();
    formData.append('rating', String(editRating));
    if (editTitle.trim()) formData.append('title', editTitle.trim());
    formData.append('body', editBody.trim());
    formData.append('pros', JSON.stringify(editPros));
    formData.append('cons', JSON.stringify(editCons));

    updateReviewMutation.mutate({ id: editingReview.id, data: formData });
  };

  const reviewsList = myReviewsData?.results || [];
  const questionsList = myQuestionsData?.results || [];

  const getStatusBadge = (status: ReviewStatus | QuestionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved & Public
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Under Moderation
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <EyeOff className="w-3.5 h-3.5" />
            Hidden
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-display text-fg-primary tracking-tight">
          My Reviews & Technical Inquiries
        </h2>
        <p className="text-xs text-fg-secondary font-mono mt-1">
          Inspect, modify, or track the moderation status of your product evaluations and inquiries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all',
            activeTab === 'reviews'
              ? 'bg-accent text-accent-fg shadow-subtle'
              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
          )}
        >
          <Star className="w-4 h-4" />
          <span>My Reviews ({reviewsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all',
            activeTab === 'questions'
              ? 'bg-accent text-accent-fg shadow-subtle'
              : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
          )}
        >
          <HelpCircle className="w-4 h-4" />
          <span>My Inquiries ({questionsList.length})</span>
        </button>
      </div>

      {/* Tab 1: My Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {isLoadingReviews ? (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-mono">Loading your evaluations...</span>
            </div>
          ) : reviewsList.length === 0 ? (
            <div className="p-10 rounded-2xl bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted border border-border-subtle mb-1">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-fg-primary">
                No Reviews Submitted Yet
              </h3>
              <p className="text-xs text-fg-secondary max-w-sm">
                After purchasing and receiving delivered artifacts, you can share evaluations from the product pages.
              </p>
              <Link href="/products" className="pt-2">
                <Button size="sm" variant="outline" className="text-xs font-mono">
                  Explore Catalog
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 shadow-card space-y-4 transition-all"
                >
                  {/* Top Bar: Product Link + Status + Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle/70">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${rev.product_slug || rev.product}`}
                        className="text-sm font-bold font-display text-fg-primary hover:text-accent transition-colors flex items-center gap-1.5"
                      >
                        <span>{rev.product_name || 'Artifact Evaluation'}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-fg-muted" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(rev.status)}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(rev)}
                        className="h-8 px-2.5 text-xs text-fg-secondary hover:text-fg-primary"
                        title="Edit Review"
                      >
                        <Edit3 className="w-3.5 h-3.5 me-1" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this evaluation permanently?')) {
                            deleteReviewMutation.mutate(rev.id);
                          }
                        }}
                        className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Delete Review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Rejection Alert */}
                  {rev.status === 'REJECTED' && rev.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Moderator Feedback / Reason for Decline:</span>
                        <span className="mt-0.5 block">{rev.rejection_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Rating + Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-4 h-4',
                            i < rev.rating ? 'fill-current' : 'text-fg-muted opacity-30'
                          )}
                        />
                      ))}
                      <span className="text-xs font-mono font-bold text-fg-primary ms-1.5">
                        {rev.rating}.0 / 5
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-fg-muted">
                      Submitted on {formatDate(rev.created_at)}
                    </span>
                  </div>

                  {/* Title & Body */}
                  {rev.title && (
                    <h4 className="text-xs font-bold text-fg-primary font-display">
                      {rev.title}
                    </h4>
                  )}
                  <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-line">
                    {rev.body}
                  </p>

                  {/* Pros & Cons */}
                  {((rev.pros && rev.pros.length > 0) || (rev.cons && rev.cons.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {rev.pros && rev.pros.length > 0 && (
                        <div className="space-y-1 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                            Strengths
                          </span>
                          <ul className="text-xs text-fg-secondary space-y-0.5">
                            {rev.pros.map((p, i) => (
                              <li key={i}>• {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rev.cons && rev.cons.length > 0 && (
                        <div className="space-y-1 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15">
                          <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                            Areas of Caution
                          </span>
                          <ul className="text-xs text-fg-secondary space-y-0.5">
                            {rev.cons.map((c, i) => (
                              <li key={i}>• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Images */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {rev.images.map((img) => (
                        <div
                          key={img.id}
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-border-subtle bg-bg-secondary"
                        >
                          <Image
                            src={img.thumbnail || img.image}
                            alt="Attached photo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Response */}
                  {rev.staff_response && (
                    <div className="p-3.5 rounded-xl bg-bg-secondary/90 border border-border-accent/40 space-y-1.5 relative overflow-hidden">
                      <div className="absolute top-0 start-0 bottom-0 w-1 bg-accent" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-accent uppercase">
                          <Sparkles className="w-3 h-3" />
                          Official Atelier Response
                        </span>
                        <span className="text-[10px] font-mono text-fg-muted">
                          {formatDate(rev.staff_response.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-fg-primary leading-relaxed whitespace-pre-line ps-1">
                        {rev.staff_response.response_text}
                      </p>
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-fg-muted">
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <ThumbsUp className="w-3 h-3" />
                      {rev.helpful_count ?? 0} Helpful votes
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <ThumbsDown className="w-3 h-3" />
                      {rev.unhelpful_count ?? 0} Unhelpful votes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Inquiries & Questions */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {isLoadingQuestions ? (
            <div className="flex flex-col items-center justify-center py-16 text-fg-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-mono">Loading your inquiries...</span>
            </div>
          ) : questionsList.length === 0 ? (
            <div className="p-10 rounded-2xl bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted border border-border-subtle mb-1">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-fg-primary">
                No Questions Submitted Yet
              </h3>
              <p className="text-xs text-fg-secondary max-w-sm">
                Have inquiries regarding sizing or technical specifications? Ask directly on any product page.
              </p>
              <Link href="/products" className="pt-2">
                <Button size="sm" variant="outline" className="text-xs font-mono">
                  Browse Artifacts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {questionsList.map((q) => (
                <div
                  key={q.id}
                  className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 shadow-card space-y-4 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle/70">
                    <Link
                      href={`/products/${q.product_slug || q.product}`}
                      className="text-sm font-bold font-display text-fg-primary hover:text-accent transition-colors flex items-center gap-1.5"
                    >
                      <span>{q.product_name || 'Product Inquiry'}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-fg-muted" />
                    </Link>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(q.status)}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this question?')) {
                            deleteQuestionMutation.mutate(q.id);
                          }
                        }}
                        className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {q.status === 'REJECTED' && q.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Decline Reason:</span>
                        <span className="mt-0.5 block">{q.rejection_reason}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-fg-primary font-medium leading-relaxed whitespace-pre-line">
                    {q.question}
                  </p>

                  {q.answer ? (
                    <div className="p-3.5 rounded-xl bg-bg-secondary/90 border border-border-accent/40 space-y-1.5 relative overflow-hidden">
                      <div className="absolute top-0 start-0 bottom-0 w-1 bg-accent" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-accent uppercase">
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
                    <div className="p-3 rounded-lg bg-bg-secondary/50 border border-border-subtle/60 flex items-center gap-2 text-[11px] font-mono text-fg-muted">
                      <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>Inquiry is currently in queue awaiting specialist response.</span>
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-fg-muted pt-1">
                    Submitted on {formatDate(q.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Review Modal */}
      <Modal
        isOpen={Boolean(editingReview)}
        onClose={() => setEditingReview(null)}
        title="Edit Evaluation"
        description="Updating an approved evaluation will resubmit it to moderation."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditReview} className="space-y-4">
          {editFormError && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editFormError}</span>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Rating *
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={cn(
                      'w-6 h-6',
                      editRating >= star ? 'text-amber-400 fill-current' : 'text-fg-muted opacity-30'
                    )}
                  />
                </button>
              ))}
              <span className="text-xs font-mono text-fg-muted ms-2">
                {editRating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Headline Summary
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Evaluation Body *
            </label>
            <textarea
              rows={4}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none resize-none"
            />
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pros */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-emerald-400 uppercase">
                Strengths (Pros)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={editProInput}
                  onChange={(e) => setEditProInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (editProInput.trim()) {
                        setEditPros((p) => [...p, editProInput.trim()]);
                        setEditProInput('');
                      }
                    }
                  }}
                  placeholder="Add strength..."
                  className="flex-1 p-2 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (editProInput.trim()) {
                      setEditPros((p) => [...p, editProInput.trim()]);
                      setEditProInput('');
                    }
                  }}
                  className="text-xs px-2"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {editPros.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400"
                  >
                    <span>{p}</span>
                    <button type="button" onClick={() => setEditPros((pr) => pr.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-rose-400 uppercase">
                Areas of Caution (Cons)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={editConInput}
                  onChange={(e) => setEditConInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (editConInput.trim()) {
                        setEditCons((c) => [...c, editConInput.trim()]);
                        setEditConInput('');
                      }
                    }
                  }}
                  placeholder="Add con..."
                  className="flex-1 p-2 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (editConInput.trim()) {
                      setEditCons((c) => [...c, editConInput.trim()]);
                      setEditConInput('');
                    }
                  }}
                  className="text-xs px-2"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {editCons.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400"
                  >
                    <span>{c}</span>
                    <button type="button" onClick={() => setEditCons((co) => co.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingReview(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={updateReviewMutation.isPending}
              disabled={updateReviewMutation.isPending || !editBody.trim()}
              className="text-xs font-semibold"
            >
              Save & Resubmit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
