'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth';
import {
  useProductReviews,
  useCreateReview,
  useVoteReview,
  useReportReview,
  ProductReviewsParams,
} from '../queries/useProductReviews';
import { useReviewSummary } from '../queries/useReviewSummary';
import { useReviewEligibility } from '../queries/useReviewEligibility';
import { Review, ReviewImage, ReviewReportReason } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import { formatDate } from '@/lib/utils/format';
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Image as ImageIcon,
  Plus,
  Minus,
  X,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Filter,
  ArrowUpDown,
  UploadCloud,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ProductReviewsProps {
  productId: string;
  className?: string;
}

const RATING_LABELS: Record<number, string> = {
  5: 'Flawless (5 / 5)',
  4: 'Very Good (4 / 5)',
  3: 'Good (3 / 5)',
  2: 'Fair (2 / 5)',
  1: 'Poor (1 / 5)',
};

const REPORT_REASONS: { key: ReviewReportReason; label: string }[] = [
  { key: 'SPAM', label: 'Commercial spam or promotional links' },
  { key: 'OFFENSIVE', label: 'Offensive, hateful, or abusive language' },
  { key: 'FAKE', label: 'Fraudulent or deceptive review' },
  { key: 'IRRELEVANT', label: 'Unrelated to this artifact' },
  { key: 'INAPPROPRIATE_IMAGE', label: 'Inappropriate or non-compliant image' },
  { key: 'OTHER', label: 'Other violation' },
];

export function ProductReviews({ productId, className }: ProductReviewsProps) {
  const { user, isAuthenticated } = useAuthStore();

  // Filter & Sort State
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [withImagesOnly, setWithImagesOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Queries
  const queryParams: ProductReviewsParams = {
    rating: selectedRating,
    verified: verifiedOnly ? true : undefined,
    has_images: withImagesOnly ? true : undefined,
    sort: sortOption,
    page: currentPage,
    page_size: 10,
  };

  const { data: reviewsData, isLoading: isLoadingReviews, isFetching } = useProductReviews(
    productId,
    queryParams
  );
  const { data: summary, isLoading: isLoadingSummary } = useReviewSummary(productId);
  const { data: eligibility } = useReviewEligibility(productId);

  // Mutations
  const createReviewMutation = useCreateReview(productId);
  const voteMutation = useVoteReview(productId);
  const reportMutation = useReportReview();

  // Modal States
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<Review | null>(null);
  const [reportReason, setReportReason] = useState<ReviewReportReason>('SPAM');
  const [reportDetails, setReportDetails] = useState('');

  // Lightbox Modal State
  const [activeLightboxImages, setActiveLightboxImages] = useState<ReviewImage[] | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number>(0);

  // Form State for Review Creation
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [proInput, setProInput] = useState('');
  const [cons, setCons] = useState<string[]>([]);
  const [conInput, setConInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reviews = reviewsData?.results || [];
  const totalCount = reviewsData?.count ?? summary?.total_reviews ?? 0;

  // Rating breakdown percentages
  const ratingBreakdown = summary?.rating_breakdown || {
    '5': { stars: 5, count: 0, percentage: 0 },
    '4': { stars: 4, count: 0, percentage: 0 },
    '3': { stars: 3, count: 0, percentage: 0 },
    '2': { stars: 2, count: 0, percentage: 0 },
    '1': { stars: 1, count: 0, percentage: 0 },
  };

  // Image Selection Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    if (selectedImages.length + files.length > 5) {
      setFormError('You can upload a maximum of 5 images per review.');
      return;
    }

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormError('Only JPEG, PNG, and WebP images are allowed.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Each image must be under 5MB in size.');
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setFormError(null);
    setSelectedImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddPro = () => {
    if (!proInput.trim()) return;
    if (pros.length >= 6) {
      notify.error('Limit reached', 'Maximum 6 pros allowed.');
      return;
    }
    setPros((prev) => [...prev, proInput.trim()]);
    setProInput('');
  };

  const handleRemovePro = (index: number) => {
    setPros((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCon = () => {
    if (!conInput.trim()) return;
    if (cons.length >= 6) {
      notify.error('Limit reached', 'Maximum 6 cons allowed.');
      return;
    }
    setCons((prev) => [...prev, conInput.trim()]);
    setConInput('');
  };

  const handleRemoveCon = (index: number) => {
    setCons((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please select a rating between 1 and 5 stars.');
      return;
    }
    if (!body.trim() || body.trim().length < 5) {
      setFormError('Review evaluation must be at least 5 characters.');
      return;
    }

    setFormError(null);

    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('rating', String(rating));
    if (title.trim()) formData.append('title', title.trim());
    formData.append('body', body.trim());

    if (pros.length > 0) {
      formData.append('pros', JSON.stringify(pros));
    }
    if (cons.length > 0) {
      formData.append('cons', JSON.stringify(cons));
    }

    selectedImages.forEach((file) => {
      formData.append('images', file);
    });

    try {
      await createReviewMutation.mutateAsync(formData);
      setIsWriteModalOpen(false);
      // Reset form
      setRating(5);
      setTitle('');
      setBody('');
      setPros([]);
      setCons([]);
      setSelectedImages([]);
      setImagePreviews([]);
      notify.success(
        'Review Submitted',
        'Your evaluation has been submitted and sent to the atelier moderation queue.'
      );
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      setFormError(parsed.message);
    }
  };

  // Vote on Review
  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      notify.info('Authentication Required', 'Please sign in to vote on evaluations.');
      return;
    }
    try {
      await voteMutation.mutateAsync({ id: reviewId, isHelpful });
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Voting Error', parsed.message);
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForReport) return;

    try {
      await reportMutation.mutateAsync({
        id: selectedReviewForReport.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setIsReportModalOpen(false);
      setSelectedReviewForReport(null);
      setReportDetails('');
      notify.success('Report Filed', 'Thank you. Our moderation team will investigate this evaluation.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      notify.error('Reporting Failed', parsed.message);
    }
  };

  return (
    <section className={cn('space-y-8 pt-10 border-t border-border-subtle text-start', className)}>
      {/* 1. Header & Quick Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display text-fg-primary flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-accent" />
            Client Impressions & Reviews
          </h3>
          <p className="text-xs text-fg-secondary font-mono mt-1">
            Verified delivered purchase evaluations & atelier insights
          </p>
        </div>

        {/* Action Button: Write Review */}
        <div>
          {!isAuthenticated ? (
            <Link href={`/login?redirect=/products/${productId}`}>
              <Button size="sm" variant="outline" className="text-xs font-mono">
                <Lock className="w-3.5 h-3.5 me-1.5" />
                Sign In to Review
              </Button>
            </Link>
          ) : eligibility?.has_reviewed ? (
            <Badge variant="mono" size="md" className="font-mono text-xs py-1.5 px-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 me-1.5" />
              Evaluation Submitted
            </Badge>
          ) : eligibility?.can_review ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsWriteModalOpen(true)}
              className="text-xs font-semibold shadow-glow"
            >
              <Plus className="w-3.5 h-3.5 me-1.5" />
              Write an Evaluation
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsWriteModalOpen(true)}
              className="text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5 me-1.5" />
              Write a Review
            </Button>
          )}
        </div>
      </div>

      {/* 2. Rating Breakdown & Summary Card */}
      <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Big Average Score */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-e border-border-subtle/80">
            <span className="text-5xl sm:text-6xl font-black font-display text-fg-primary tracking-tight">
              {summary ? summary.average_rating.toFixed(1) : '0.0'}
            </span>
            <div className="flex items-center gap-1 my-3 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-5 h-5',
                    summary && i < Math.round(summary.average_rating)
                      ? 'fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'text-fg-muted opacity-30'
                  )}
                />
              ))}
            </div>
            <p className="text-xs font-mono text-fg-secondary">
              Based on {summary?.total_reviews ?? 0} authentic client evaluations
            </p>

            <div className="flex items-center gap-4 mt-4 text-[11px] font-mono text-fg-muted">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                {summary?.verified_purchases_count ?? 0} Verified
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-accent">
                <ImageIcon className="w-3.5 h-3.5" />
                {summary?.with_images_count ?? 0} With Photos
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Histogram */}
          <div className="md:col-span-8 space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const row = ratingBreakdown[String(star)] || { stars: star, count: 0, percentage: 0 };
              const isSelected = selectedRating === star;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setSelectedRating(isSelected ? undefined : star);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-1.5 rounded-lg transition-all text-start group',
                    isSelected
                      ? 'bg-accent/10 ring-1 ring-accent'
                      : 'hover:bg-bg-secondary/60'
                  )}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0 text-xs font-mono font-medium text-fg-primary">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 h-2.5 bg-bg-secondary rounded-full overflow-hidden border border-border-subtle/50 relative">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isSelected
                          ? 'bg-accent'
                          : star >= 4
                          ? 'bg-amber-400 group-hover:bg-amber-300'
                          : star === 3
                          ? 'bg-amber-500/80'
                          : 'bg-zinc-500'
                      )}
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>

                  <div className="w-20 text-end shrink-0 flex items-center justify-end gap-1.5 text-xs font-mono text-fg-muted">
                    <span className="font-semibold text-fg-primary">{row.count}</span>
                    <span className="text-[11px] opacity-70">({row.percentage}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Filters, Toggles & Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-secondary/70 border border-border-subtle">
        {/* Rating Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedRating(undefined);
              setCurrentPage(1);
            }}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-mono transition-all',
              selectedRating === undefined
                ? 'bg-accent text-accent-fg font-bold shadow-sm'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
            )}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSelectedRating(selectedRating === s ? undefined : s);
                setCurrentPage(1);
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-all',
                selectedRating === s
                  ? 'bg-accent text-accent-fg font-bold shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated'
              )}
            >
              <span>{s}</span>
              <Star className="w-3 h-3 fill-current text-amber-400" />
            </button>
          ))}
        </div>

        {/* Checkbox Toggles & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-xs font-mono text-fg-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
            />
            <span>Verified Only</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-mono text-fg-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withImagesOnly}
              onChange={(e) => {
                setWithImagesOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-border-subtle bg-bg-primary text-accent focus:ring-accent"
            />
            <span>With Photos</span>
          </label>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 ps-2 border-s border-border-subtle">
            <ArrowUpDown className="w-3.5 h-3.5 text-fg-muted" />
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-bg-elevated text-fg-primary text-xs font-mono rounded-md px-2 py-1 border border-border-subtle focus:outline-none focus:border-accent"
            >
              <option value="newest">Newest First</option>
              <option value="helpful">Most Helpful</option>
              <option value="rating_high">Highest Rating</option>
              <option value="rating_low">Lowest Rating</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Loading & Empty States */}
      {isLoadingReviews && (
        <div className="flex flex-col items-center justify-center py-16 text-fg-muted space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="text-xs font-mono">Retrieving client evaluations...</span>
        </div>
      )}

      {!isLoadingReviews && reviews.length === 0 && (
        <div className="p-10 rounded-2xl bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted border border-border-subtle">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold font-display text-fg-primary">
            No Evaluations Match Your Criteria
          </h4>
          <p className="text-xs text-fg-secondary max-w-md">
            {selectedRating || verifiedOnly || withImagesOnly
              ? 'Try adjusting your filters or search terms to inspect more reviews.'
              : 'Be the first verified patron of this artifact to submit an evaluation.'}
          </p>
          {(selectedRating || verifiedOnly || withImagesOnly) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedRating(undefined);
                setVerifiedOnly(false);
                setWithImagesOnly(false);
              }}
              className="text-xs font-mono mt-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}

      {/* 5. Review Cards List */}
      {!isLoadingReviews && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <article
              key={rev.id}
              className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 shadow-card space-y-4 transition-all hover:border-border-accent/40"
            >
              {/* Header: Author, Rating, Badges, Date */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-xs font-mono font-bold text-fg-primary shadow-inner">
                    {rev.user_display_name ? rev.user_display_name.slice(0, 2).toUpperCase() : 'PX'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-display text-fg-primary">
                        {rev.user_display_name || rev.user_name || 'Anonymous Client'}
                      </span>
                      {rev.is_verified_purchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Patron
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-fg-muted">
                      {formatDate(rev.created_at)}
                    </span>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 text-amber-400 bg-bg-secondary/60 px-2.5 py-1 rounded-lg border border-border-subtle/50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3.5 h-3.5',
                        i < rev.rating ? 'fill-current drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]' : 'text-fg-muted opacity-30'
                      )}
                    />
                  ))}
                  <span className="text-xs font-bold font-mono text-fg-primary ms-1">
                    {rev.rating}.0
                  </span>
                </div>
              </div>

              {/* Review Title */}
              {rev.title && (
                <h4 className="text-sm font-bold text-fg-primary font-display pt-1">
                  {rev.title}
                </h4>
              )}

              {/* Review Body */}
              <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-line">
                {rev.body || rev.comment}
              </p>

              {/* Pros & Cons Tags */}
              {((rev.pros && rev.pros.length > 0) || (rev.cons && rev.cons.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {rev.pros && rev.pros.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        Key Strengths
                      </span>
                      <ul className="space-y-1">
                        {rev.pros.map((p, idx) => (
                          <li key={idx} className="text-xs text-fg-primary flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rev.cons && rev.cons.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        Areas of Caution
                      </span>
                      <ul className="space-y-1">
                        {rev.cons.map((c, idx) => (
                          <li key={idx} className="text-xs text-fg-primary flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Attached Photos Gallery */}
              {rev.images && rev.images.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2.5">
                    {rev.images.map((img, imgIdx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          setActiveLightboxImages(rev.images || []);
                          setActiveLightboxIndex(imgIdx);
                        }}
                        className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border-subtle bg-bg-secondary hover:border-accent transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <Image
                          src={img.thumbnail || img.image}
                          alt="Review attachment"
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Staff Response Box */}
              {rev.staff_response && (
                <div className="mt-4 p-4 rounded-xl bg-bg-secondary/90 border border-border-accent/40 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 start-0 bottom-0 w-1 bg-accent" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-accent-fg uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      {rev.staff_response.staff_name || 'Paradox Atelier Team'}
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

              {/* Footer: Helpful Voting & Community Report */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle/60 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-fg-muted text-[11px]">Helpful?</span>
                  <button
                    type="button"
                    onClick={() => handleVote(rev.id, true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border',
                      rev.user_vote === true
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold'
                        : 'bg-bg-secondary text-fg-secondary border-border-subtle hover:text-fg-primary hover:bg-bg-elevated'
                    )}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{rev.helpful_count ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(rev.id, false)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all border',
                      rev.user_vote === false
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold'
                        : 'bg-bg-secondary text-fg-secondary border-border-subtle hover:text-fg-primary hover:bg-bg-elevated'
                    )}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>{rev.unhelpful_count ?? 0}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedReviewForReport(rev);
                    setIsReportModalOpen(true);
                  }}
                  className="text-fg-muted hover:text-rose-400 transition-colors p-1 rounded inline-flex items-center gap-1 text-[11px]"
                >
                  <Flag className="w-3 h-3" />
                  <span>Report</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 6. Write Review Modal */}
      <Modal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        title="Submit an Evaluation"
        description="Share your impressions and technical appraisal of this delivered artifact."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitReview} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Rating Score *
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-7 h-7 transition-colors',
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'text-fg-muted opacity-30'
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono font-semibold text-accent">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Headline Summary (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder="e.g. Exceptional craftsmanship, unmatched durability"
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
                Detailed Evaluation *
              </label>
              <span className="text-[10px] font-mono text-fg-muted">{body.length} / 2000</span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="Provide a balanced appraisal of ergonomics, material quality, fit, and aesthetic presentation..."
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Dynamic Pros & Cons Builders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Strengths (Pros)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={proInput}
                  onChange={(e) => setProInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPro())}
                  placeholder="Add positive highlight..."
                  className="flex-1 p-2 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-emerald-500 focus:outline-none"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddPro} className="text-xs px-2.5">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pros.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    <span>{p}</span>
                    <button type="button" onClick={() => handleRemovePro(i)}>
                      <X className="w-3 h-3 hover:text-fg-primary" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Minus className="w-3.5 h-3.5" />
                Weaknesses (Cons)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={conInput}
                  onChange={(e) => setConInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCon())}
                  placeholder="Add point of caution..."
                  className="flex-1 p-2 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-rose-500 focus:outline-none"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddCon} className="text-xs px-2.5">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cons.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  >
                    <span>{c}</span>
                    <button type="button" onClick={() => handleRemoveCon(i)}>
                      <X className="w-3 h-3 hover:text-fg-primary" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Image Uploader */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider flex items-center justify-between">
              <span>Photo Attachments (Up to 5, max 5MB each)</span>
              <span className="text-fg-muted">{selectedImages.length} / 5</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border-subtle bg-bg-secondary">
                  <Image src={preview} alt="Upload preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 end-1 w-4 h-4 bg-black/75 rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {selectedImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-border-subtle hover:border-accent bg-bg-secondary/50 flex flex-col items-center justify-center text-fg-muted hover:text-fg-primary transition-all"
                >
                  <UploadCloud className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] font-mono font-semibold">Upload</span>
                </button>
              )}
            </div>
          </div>

          {/* Moderation Disclaimer Notice */}
          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle flex items-start gap-2.5 text-[11px] text-fg-secondary font-mono">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              All evaluations are processed through automated and human moderation prior to public publication.
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsWriteModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={createReviewMutation.isPending}
              disabled={createReviewMutation.isPending || !body.trim()}
              className="text-xs font-semibold"
            >
              Submit for Moderation
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Community Abuse Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Review"
        description="Help maintain a high-trust, respectful atelier environment."
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-fg-primary uppercase tracking-wider block">
              Reason for Reporting *
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
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
                    name="reportReason"
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
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Provide context regarding this policy violation..."
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

      {/* 8. Lightbox Full-Screen Modal */}
      {activeLightboxImages && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setActiveLightboxImages(null)}
        >
          <button
            type="button"
            onClick={() => setActiveLightboxImages(null)}
            className="absolute top-5 end-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
            aria-label="Close image viewer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous Button */}
          {activeLightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveLightboxIndex((prev) =>
                  prev === 0 ? activeLightboxImages.length - 1 : prev - 1
                );
              }}
              className="absolute start-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Large Image */}
          <div
            className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeLightboxImages[activeLightboxIndex]?.image}
              alt="Full size review attachment"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Next Button */}
          {activeLightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveLightboxIndex((prev) =>
                  prev === activeLightboxImages.length - 1 ? 0 : prev + 1
                );
              }}
              className="absolute end-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Bottom Thumbnails */}
          {activeLightboxImages.length > 1 && (
            <div
              className="absolute bottom-6 flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {activeLightboxImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveLightboxIndex(i)}
                  className={cn(
                    'relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                    i === activeLightboxIndex ? 'border-accent scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <Image src={img.thumbnail || img.image} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
