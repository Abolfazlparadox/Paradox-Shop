'use client';

import React, { useState, Suspense } from 'react';
import { useAdminComments, useModerateComment, useReplyComment } from '@/hooks/useAdminData';
import { AdminCommentItem } from '@/types/api';
import { AdminReplyModal } from '@/components/admin/AdminReplyModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Reply,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminCommentsContent() {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'STAFF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingComment, setReplyingComment] = useState<AdminCommentItem | null>(null);

  const {
    data: comments = [],
    isLoading,
    refetch,
  } = useAdminComments({
    is_approved: filter === 'ALL' ? undefined : filter === 'APPROVED' ? true : filter === 'PENDING' ? false : undefined,
    search: searchQuery,
  });

  const moderateCommentMutation = useModerateComment();
  const replyCommentMutation = useReplyComment();

  const handleModerate = async (commentId: string, isApproved: boolean) => {
    try {
      await moderateCommentMutation.mutateAsync({ id: commentId, is_approved: isApproved });
      notify.success(
        isApproved ? 'Inquiry Approved' : 'Inquiry Dismissed',
        `Discussion item marked as ${isApproved ? 'published' : 'rejected'}.`
      );
    } catch {
      notify.error('Action Failed', 'Failed to update moderation state.');
    }
  };

  const handleSendReply = async (commentId: string, content: string) => {
    await replyCommentMutation.mutateAsync({ id: commentId, content });
  };

  const filteredComments = comments.filter((c) => {
    if (filter === 'STAFF') return c.is_staff_reply;
    return true;
  });

  const sentimentStyles: Record<string, { label: string; bg: string; text: string }> = {
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
            <span>Q&A & Technical Comment Moderation</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Audit technical inquiries, moderate public discussion, and publish official staff replies
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-mono border-border-subtle hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary cursor-pointer"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search comment content, patron..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {[
            { id: 'ALL', label: 'All Discussions' },
            { id: 'PENDING', label: 'Needs Approval' },
            { id: 'APPROVED', label: 'Published' },
            { id: 'STAFF', label: 'Staff Responses' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                filter === tab.id
                  ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : filteredComments.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-50 text-cyan-500" />
            <p>No discussion threads matching the active filter.</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const sentiment = sentimentStyles[comment.sentiment] || sentimentStyles.NEUTRAL;
            return (
              <div
                key={comment.id}
                className={cn(
                  'p-6 rounded-2xl bg-bg-elevated border transition-all space-y-4 shadow-sm',
                  !comment.is_approved
                    ? 'border-amber-500/40 bg-amber-500/[0.02]'
                    : 'border-border-subtle'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle/60 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      {comment.author_name ? comment.author_name[0].toUpperCase() : 'P'}
                    </div>
                    <div>
                      <span className="font-bold text-fg-primary font-display">{comment.author_name}</span>
                      <span className="text-fg-muted text-[11px] ms-2">on {comment.product_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        sentiment.bg,
                        sentiment.text
                      )}
                    >
                      {sentiment.label}
                    </span>
                    <span className="text-[10px] text-fg-muted">{formatDate(comment.created_at)}</span>
                  </div>
                </div>

                <p className="text-xs text-fg-secondary leading-relaxed font-sans font-medium">
                  {comment.content}
                </p>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ps-4 border-s-2 border-cyan-500/40 space-y-2 mt-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="p-3 rounded-xl bg-bg-secondary/60 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                          <span>{reply.author_name} (Official Atelier Response)</span>
                          <span className="text-fg-muted">{formatDate(reply.created_at)}</span>
                        </div>
                        <p className="text-fg-secondary">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border',
                      comment.is_approved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    )}
                  >
                    {comment.is_approved ? 'Published' : 'Awaiting Clearance'}
                  </span>

                  <div className="flex items-center gap-2">
                    {!comment.is_approved ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerate(comment.id, false)}
                          className="text-[11px] font-mono text-rose-500 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleModerate(comment.id, true)}
                          className="text-[11px] font-mono bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 font-bold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingComment(comment)}
                        className="text-[11px] font-mono border-border-subtle hover:bg-bg-secondary text-cyan-600 dark:text-cyan-400 cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5 mr-1" />
                        Reply as Staff
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Modal */}
      {replyingComment && (
        <AdminReplyModal
          comment={replyingComment}
          isOpen={Boolean(replyingComment)}
          onClose={() => setReplyingComment(null)}
          onSendReply={handleSendReply}
        />
      )}
    </div>
  );
}

export default function AdminCommentsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={4} />}>
      <AdminCommentsContent />
    </Suspense>
  );
}
