'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import { AdminComment, SentimentType } from '@/types/admin';
import { AdminReplyModal } from '@/components/admin/AdminReplyModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Reply,
  Sparkles,
  Shield,
  Filter,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'STAFF'>('ALL');
  const [replyingComment, setReplyingComment] = useState<AdminComment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getComments();
      setComments(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleModerate = async (commentId: string, isApproved: boolean) => {
    await adminApi.moderateComment(commentId, isApproved);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, is_approved: isApproved } : c))
    );
    notify.success(
      isApproved ? 'Inquiry Approved' : 'Inquiry Dismissed',
      `Discussion item marked as ${isApproved ? 'published' : 'rejected'}.`
    );
  };

  const handleSendReply = async (commentId: string, content: string) => {
    const newReply = await adminApi.replyToComment(commentId, content);
    setComments((prev) => [
      newReply,
      ...prev.map((c) => (c.id === commentId ? { ...c, is_approved: true, replies_count: (c.replies_count || 0) + 1 } : c)),
    ]);
  };

  const filteredComments = comments.filter((c) => {
    if (filter === 'PENDING') return !c.is_approved;
    if (filter === 'APPROVED') return c.is_approved && !c.is_staff_reply;
    if (filter === 'STAFF') return c.is_staff_reply;
    return true;
  });

  const sentimentStyles: Record<SentimentType, { label: string; bg: string; text: string }> = {
    POSITIVE: { label: 'Positive Tone', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    NEUTRAL: { label: 'Neutral Inquiry', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
    NEGATIVE: { label: 'Concern / Flaw', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-rose-500 dark:text-rose-400" />
            <span>Q&A & Comment Moderation</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Audit technical inquiries, moderate public discussion, and publish official staff replies
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadComments}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl font-mono text-xs overflow-x-auto transition-colors">
        {[
          { id: 'ALL', label: `All Inquiries (${comments.length})` },
          { id: 'PENDING', label: `Needs Review (${comments.filter((c) => !c.is_approved).length})` },
          { id: 'APPROVED', label: 'Approved Reviews' },
          { id: 'STAFF', label: 'Staff Official Replies' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer',
              filter === tab.id
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border border-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comments Master List */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : filteredComments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
          <MessageSquare className="w-8 h-8 text-fg-muted mx-auto opacity-50" />
          <p>No comments match active moderation filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((c) => {
            const sentiment = sentimentStyles[c.sentiment];

            return (
              <div
                key={c.id}
                className={cn(
                  'p-5 rounded-2xl bg-bg-elevated border transition-all space-y-3 shadow-sm dark:shadow-xl',
                  c.is_staff_reply
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : c.is_approved
                    ? 'border-border-subtle'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fg-primary font-display flex items-center gap-1.5">
                      {c.is_staff_reply && <Shield className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />}
                      {c.author_name}
                    </span>
                    <span className="text-fg-muted font-mono text-[10px]">•</span>
                    <span className="text-fg-secondary font-mono text-[11px]">{c.product_name}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className={cn('px-2 py-0.5 rounded-full font-bold', sentiment.bg, sentiment.text)}>
                      {sentiment.label}
                    </span>
                    <span className="text-fg-muted">{formatDate(c.created_at)}</span>
                  </div>
                </div>

                <p className="text-xs text-fg-primary leading-relaxed font-sans">
                  &ldquo;{c.content}&rdquo;
                </p>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between pt-1 text-xs font-mono">
                  <div className="text-[11px] text-fg-muted">
                    {c.replies_count ? `${c.replies_count} Threaded Responses` : 'No replies yet'}
                  </div>

                  <div className="flex items-center gap-2">
                    {!c.is_staff_reply && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingComment(c)}
                        className="text-[11px] font-mono border-border-subtle hover:bg-bg-secondary text-fg-primary px-2.5 py-1 h-auto flex items-center gap-1"
                      >
                        <Reply className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                        <span>Staff Reply</span>
                      </Button>
                    )}

                    {!c.is_approved ? (
                      <>
                        <button
                          onClick={() => handleModerate(c.id, false)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/20 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleModerate(c.id, true)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 transition-colors"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleModerate(c.id, false)}
                        className="px-2.5 py-1 rounded-lg text-fg-muted hover:text-rose-600 dark:hover:text-rose-400 text-[11px] transition-colors"
                      >
                        Unpublish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Reply Modal */}
      <AdminReplyModal
        comment={replyingComment}
        isOpen={Boolean(replyingComment)}
        onClose={() => setReplyingComment(null)}
        onSendReply={handleSendReply}
      />
    </div>
  );
}
