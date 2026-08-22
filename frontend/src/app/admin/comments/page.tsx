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
    POSITIVE: { label: 'Positive', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    NEUTRAL: { label: 'Inquiry', bg: 'bg-slate-500/10', text: 'text-slate-300' },
    NEGATIVE: { label: 'Critical', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-rose-400" />
            <span>Q&A & Review Moderation Desk</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Approve client product inquiries, assess sentiments, and dispatch official staff responses
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadComments}
          className="text-xs font-mono border-slate-800 hover:bg-slate-800 text-slate-300"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl flex items-center gap-2 font-mono text-xs overflow-x-auto">
        {(['ALL', 'PENDING', 'APPROVED', 'STAFF'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap',
              filter === tab
                ? 'bg-rose-500/10 text-rose-300 font-bold border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            )}
          >
            {tab === 'ALL' && `All Discussions (${comments.length})`}
            {tab === 'PENDING' && `Pending Approval (${comments.filter((c) => !c.is_approved).length})`}
            {tab === 'APPROVED' && 'Approved Reviews'}
            {tab === 'STAFF' && 'Staff Replies'}
          </button>
        ))}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : filteredComments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 font-mono text-xs text-slate-400">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-white font-bold">No discussions in this queue</div>
          <p className="text-slate-500">All customer questions are currently moderated.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((c) => {
            const sentiment = sentimentStyles[c.sentiment];

            return (
              <div
                key={c.id}
                className={cn(
                  'p-5 rounded-2xl bg-slate-900/80 border transition-all space-y-4 shadow-xl backdrop-blur-xl',
                  c.is_staff_reply
                    ? 'border-cyan-500/30 bg-cyan-950/20'
                    : c.is_approved
                    ? 'border-slate-800'
                    : 'border-amber-500/30 bg-amber-950/10'
                )}
              >
                {/* Comment Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-display text-white text-sm">
                      {c.author_name}
                    </span>
                    {c.is_staff_reply && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">
                        <Shield className="w-2.5 h-2.5" />
                        Official Atelier
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400">On: {c.product_name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        sentiment.bg,
                        sentiment.text
                      )}
                    >
                      {sentiment.label}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDate(c.created_at)}</span>
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
                  &ldquo;{c.content}&rdquo;
                </p>

                {/* Action Buttons Footer */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 font-mono text-xs">
                  <div className="text-[11px] text-slate-400">
                    {c.replies_count > 0 ? `${c.replies_count} Threaded Replies` : 'No replies yet'}
                  </div>

                  <div className="flex items-center gap-2">
                    {!c.is_staff_reply && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReplyingComment(c)}
                        leftIcon={<Reply className="w-3.5 h-3.5 text-cyan-400" />}
                        className="text-[11px] font-mono border-slate-700 text-cyan-300 hover:bg-slate-800"
                      >
                        Reply as Staff
                      </Button>
                    )}

                    {!c.is_approved ? (
                      <>
                        <button
                          onClick={() => handleModerate(c.id, false)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleModerate(c.id, true)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      <AdminReplyModal
        comment={replyingComment}
        isOpen={Boolean(replyingComment)}
        onClose={() => setReplyingComment(null)}
        onSendReply={handleSendReply}
      />
    </div>
  );
}
