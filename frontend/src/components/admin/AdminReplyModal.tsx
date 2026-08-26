'use client';

import React, { useState } from 'react';
import { AdminCommentItem } from '@/types/api';
import { X, Send, MessageSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface AdminReplyModalProps {
  comment: AdminCommentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReply: (commentId: string, content: string) => Promise<void>;
}

export function AdminReplyModal({ comment, isOpen, onClose, onSendReply }: AdminReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !comment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      await onSendReply(comment.id, replyText.trim());
      notify.success('Official Reply Dispatched', 'Your staff response is now published on the storefront.');
      setReplyText('');
      onClose();
    } catch {
      notify.error('Dispatch Error', 'Failed to publish staff reply.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent text-accent-fg border border-border-subtle flex items-center justify-center shadow-subtle">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-fg-primary">Staff Official Response</div>
              <div className="text-[10px] font-mono text-fg-muted">Replying to {comment.author_name}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Original Comment Preview */}
        <div className="p-6 space-y-4 text-left">
          <div className="p-3.5 rounded-xl bg-bg-secondary/60 border border-border-subtle space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-mono text-[10px] text-fg-muted">
              <span>{comment.author_name} asked on {comment.product_name}</span>
              <span>{comment.created_at?.slice(0, 10)}</span>
            </div>
            <p className="text-fg-secondary italic leading-relaxed">
              &ldquo;{comment.content}&rdquo;
            </p>
          </div>

          {/* Form Reply Area */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-fg-muted flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-500" />
                  <span>Official Atelier Response (Published as Staff)</span>
                </label>
              </div>
              <textarea
                rows={4}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Compose a concise, professional horological/technical reply..."
                className="w-full p-3 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-amber-500/80 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-fg-muted">
                Official staff replies appear highlighted with verified emblem.
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSending}
                  className="text-xs font-semibold rounded-xl cursor-pointer"
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Publish Reply
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
