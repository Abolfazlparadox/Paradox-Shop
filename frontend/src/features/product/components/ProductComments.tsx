'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useProductComments, useCreateProductComment } from '../queries/useProductComments';
import { ProductComment, ProductCommentReply } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import { formatDate } from '@/lib/utils/format';
import {
  MessageSquare,
  CornerDownRight,
  ShieldCheck,
  Send,
  AlertCircle,
  Clock,
  Lock,
  User,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ProductCommentsProps {
  productId: string;
  className?: string;
}

export function ProductComments({ productId, className }: ProductCommentsProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { data, isLoading } = useProductComments(productId);
  const createCommentMutation = useCreateProductComment(productId);

  const comments = data?.results || [];

  // Root Comment Form State
  const [rootContent, setRootContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [throttleSeconds, setThrottleSeconds] = useState<number | null>(null);

  // Admin Reply In-line Form State
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyErrorMessage, setReplyErrorMessage] = useState<string | null>(null);

  const isStaff = Boolean(user?.is_staff || (user as any)?.is_superuser);
  const isEmailVerified = Boolean(
    isStaff || user?.profile?.email_verified || (user as any)?.email_verified || (user as any)?.is_verified
  );

  // Throttle countdown effect
  useEffect(() => {
    if (!throttleSeconds || throttleSeconds <= 0) return;
    const timer = setInterval(() => {
      setThrottleSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [throttleSeconds]);

  // Submit Root Comment
  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootContent.trim() || throttleSeconds) return;

    setErrorMessage(null);

    try {
      await createCommentMutation.mutateAsync({
        content: rootContent.trim(),
        parent: null,
      });
      setRootContent('');
      notify.success('Inquiry Published', 'Your comment has been added to the product discussion.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      setErrorMessage(parsed.message);
      if (parsed.isThrottled && parsed.retryAfterSeconds) {
        setThrottleSeconds(parsed.retryAfterSeconds);
      }
    }
  };

  // Submit Admin Reply
  const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setReplyErrorMessage(null);

    try {
      await createCommentMutation.mutateAsync({
        content: replyContent.trim(),
        parent: parentId,
      });
      setReplyContent('');
      setActiveReplyId(null);
      notify.success('Admin Response Published', 'Your official atelier response has been attached.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'generic');
      setReplyErrorMessage(parsed.message);
    }
  };

  return (
    <section className={cn('space-y-8 pt-10 border-t border-border-subtle text-start', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold font-display text-fg-primary flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            Client Inquiries & Threaded Discussions
          </h3>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Peer questions and verified atelier technical responses
          </p>
        </div>

        {comments.length > 0 && (
          <Badge variant="mono" size="sm" className="self-start sm:self-auto font-mono">
            {comments.length} {comments.length === 1 ? 'Discussion' : 'Discussions'}
          </Badge>
        )}
      </div>

      {/* Root Comment Submission Form / Auth Banners */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-5 sm:p-6 shadow-card space-y-4">
        {!isAuthenticated ? (
          // 1. Not Authenticated Banner
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-bg-secondary border border-border-subtle">
            <div className="flex items-center gap-3 text-xs text-fg-secondary">
              <Lock className="w-4 h-4 text-fg-muted shrink-0" />
              <span>Sign in to participate in technical inquiries and product Q&A.</span>
            </div>
            <Link href={`/login?redirect=/products/${productId}`}>
              <Button size="sm" variant="outline" className="text-xs shrink-0">
                Sign In to Inquire
              </Button>
            </Link>
          </div>
        ) : !isEmailVerified ? (
          // 2. Unverified Email Banner
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                Account email verification is required to participate in community discussions.
              </span>
            </div>
            <Link href={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}>
              <Button size="sm" variant="primary" className="text-xs shrink-0 bg-amber-500 hover:bg-amber-600 text-black">
                Verify Email Now
              </Button>
            </Link>
          </div>
        ) : (
          // 3. Verified User Comment Form
          <form onSubmit={handleRootSubmit} className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-fg-secondary font-medium uppercase tracking-wider">
                  Ask a Technical Inquiry
                </span>
                {isStaff && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-accent-fg uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" />
                    Staff Account
                  </span>
                )}
              </div>
              <span className={cn('font-mono text-[11px]', rootContent.length > 900 ? 'text-status-warning' : 'text-fg-muted')}>
                {rootContent.length} / 1000
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2 text-status-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <textarea
              rows={3}
              value={rootContent}
              onChange={(e) => setRootContent(e.target.value)}
              maxLength={1000}
              placeholder="Ask questions about material tolerances, dimensions, care guidelines, or dispatch specifications..."
              disabled={createCommentMutation.isPending || Boolean(throttleSeconds)}
              className="w-full p-3 text-xs rounded-lg bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-[11px] text-fg-muted font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Client Privacy (Identity Masked)</span>
              </div>

              <Button
                type="submit"
                size="sm"
                isLoading={createCommentMutation.isPending}
                disabled={
                  createCommentMutation.isPending ||
                  !rootContent.trim() ||
                  rootContent.length < 3 ||
                  Boolean(throttleSeconds)
                }
                rightIcon={<Send className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                {throttleSeconds ? `Wait ${throttleSeconds}s` : 'Post Inquiry'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          <span className="text-xs font-mono">Loading threaded inquiries...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && comments.length === 0 && (
        <div className="p-8 rounded-xl bg-bg-elevated border border-border-subtle text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted mb-1 border border-border-subtle">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold font-display text-fg-primary">
            No Inquiries Recorded
          </h4>
          <p className="text-xs text-fg-secondary max-w-sm">
            Be the first verified client to initiate a technical discussion on this artifact.
          </p>
        </div>
      )}

      {/* Threaded Discussion List */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-bg-elevated border border-border-subtle rounded-xl p-5 sm:p-6 shadow-card space-y-4 transition-all"
            >
              {/* Root Comment Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-[10px] font-mono font-bold text-fg-primary">
                    {comment.author_name ? comment.author_name.slice(0, 2).toUpperCase() : 'PX'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold font-display text-fg-primary block">
                      {comment.author_name}
                    </span>
                    <span className="text-[10px] font-mono text-fg-muted">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                </div>

                {/* Admin Reply Action Button (Rendered exclusively for is_staff) */}
                {isStaff && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                      setReplyContent('');
                      setReplyErrorMessage(null);
                    }}
                    leftIcon={<CornerDownRight className="w-3 h-3 text-accent" />}
                    className="text-[11px] h-7 px-2.5 font-mono"
                  >
                    {activeReplyId === comment.id ? 'Cancel Reply' : 'Reply as Staff'}
                  </Button>
                )}
              </div>

              {/* Root Content */}
              <p className="text-xs text-fg-secondary leading-relaxed ps-9 whitespace-pre-line">
                {comment.content}
              </p>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-3 ps-6 sm:ps-9 pt-2 border-t border-border-subtle/50">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-lg bg-bg-secondary/70 border border-border-subtle/80 space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 start-0 bottom-0 w-1 bg-accent" />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-accent text-accent-fg uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            {reply.author_name || 'Paradox Support'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-fg-muted">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-fg-primary leading-relaxed whitespace-pre-line">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* In-line Admin Reply Form */}
              {isStaff && activeReplyId === comment.id && (
                <form
                  onSubmit={(e) => handleReplySubmit(e, comment.id)}
                  className="p-4 rounded-lg bg-bg-secondary border border-border-accent space-y-3 ps-4 ms-6 sm:ms-9"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3" />
                      Official Staff Response
                    </span>
                    <span className="font-mono text-[10px] text-fg-muted">
                      {replyContent.length} / 1000
                    </span>
                  </div>

                  {replyErrorMessage && (
                    <div className="p-2.5 rounded-md bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{replyErrorMessage}</span>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={1000}
                    placeholder="Compose an authoritative technical response as Paradox Staff..."
                    className="w-full p-2.5 text-xs rounded-md bg-bg-elevated text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
                    disabled={createCommentMutation.isPending}
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveReplyId(null);
                        setReplyContent('');
                      }}
                      className="text-xs h-7"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={createCommentMutation.isPending}
                      disabled={createCommentMutation.isPending || !replyContent.trim()}
                      className="text-xs h-7 font-semibold"
                    >
                      Publish Reply
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
