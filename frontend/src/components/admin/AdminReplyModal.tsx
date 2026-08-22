'use client';

import React, { useState } from 'react';
import { AdminComment } from '@/types/admin';
import { X, Send, MessageSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface AdminReplyModalProps {
  comment: AdminComment | null;
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
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-white">Staff Official Response</div>
              <div className="text-[10px] font-mono text-slate-400">Replying to {comment.author_name}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          {/* Original Inquiry Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
              Original Inquiry on {comment.product_name}:
            </div>
            <p className="text-slate-300 italic font-sans text-xs">&ldquo;{comment.content}&rdquo;</p>
          </div>

          {/* Reply Area */}
          <div className="space-y-1.5">
            <label className="block text-[11px] text-slate-300 uppercase tracking-wider">
              Atelier Concierge Message
            </label>
            <textarea
              required
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Greetings. Regarding the technical specifications of this piece..."
              className="w-full p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-sans"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400">
              <Shield className="w-3 h-3" />
              <span>Published with Atelier Staff Verification Badge</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={isSending}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold"
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Publish Response
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
