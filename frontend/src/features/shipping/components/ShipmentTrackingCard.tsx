'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  CheckCircle2,
  Clock,
  Package,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Shipment } from '@/types/api';
import { notify } from '@/stores/notifications';

interface ShipmentTrackingCardProps {
  shipment: Shipment;
  className?: string;
}

const STEPS = [
  { key: 'pending', label: 'تایید و پردازش', desc: 'سفارش در انبار در حال آماده‌سازی است.' },
  { key: 'label_created', label: 'صدور بارنامه', desc: 'مرسوله بسته‌بندی و شماره بارنامه صادر شد.' },
  { key: 'in_transit', label: 'در مسیر ارسال', desc: 'مرسوله به ناوگان پستی / پیک تحویل داده شد.' },
  { key: 'out_for_delivery', label: 'تحویل به پیک', desc: 'بسته به پیک توزیع برای تحویل تحویل گردید.' },
  { key: 'delivered', label: 'تحویل موفق', desc: 'سفارش با موفقیت تحویل مشتری داده شد.' },
];

export function ShipmentTrackingCard({
  shipment,
  className = '',
}: ShipmentTrackingCardProps) {
  const [copied, setCopied] = useState(false);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'label_created':
        return 1;
      case 'in_transit':
        return 2;
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(shipment.status);
  const isFailed = shipment.status === 'failed';

  const handleCopyCode = () => {
    if (shipment.tracking_code) {
      navigator.clipboard.writeText(shipment.tracking_code);
      setCopied(true);
      notify.success('کپی شد', 'کد رهگیری مرسوله در کلیپ‌بورد ذخیره شد.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-neutral-900/60 border border-white/[0.08] backdrop-blur-xl p-6 md:p-8 ${className}`}
    >
      {/* Header with Tracking Number & Carrier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              وضعیت ارسال سفارش
            </span>
            {isFailed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle className="w-3 h-3" />
                تحویل ناموفق
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                {shipment.status_display}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-lg md:text-xl font-bold text-white font-mono tracking-wider">
              {shipment.tracking_code || 'در انتظار صدور'}
            </h3>
            {shipment.tracking_code && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
                title="کپی کد رهگیری"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-neutral-500" />
            <span>متصدی حمل: <strong className="text-neutral-200">{shipment.carrier_name}</strong></span>
          </div>
          {shipment.recipient_city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>مقصد: <strong className="text-neutral-200">{shipment.recipient_province}، {shipment.recipient_city}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="py-8">
        <div className="relative">
          {/* Progress Track Line */}
          <div className="absolute top-4 right-4 left-4 h-0.5 bg-white/[0.06] hidden md:block" />
          <div
            className="absolute top-4 right-4 h-0.5 bg-gradient-to-l from-amber-400 to-amber-500 transition-all duration-700 hidden md:block"
            style={{
              width: `calc(${(currentStepIdx / (STEPS.length - 1)) * 100}% - 32px)`,
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-2 relative">
            {STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 text-right md:text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 shrink-0 ${
                      isCompleted
                        ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-neutral-900 border-white/[0.1] text-neutral-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-mono font-medium">{idx + 1}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4
                      className={`text-xs md:text-sm font-semibold transition-colors ${
                        isCurrent
                          ? 'text-amber-400'
                          : isCompleted
                          ? 'text-white'
                          : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-neutral-400 max-w-[180px] md:mx-auto leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Details */}
      {(shipment.shipped_at || shipment.delivered_at || shipment.notes) && (
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            {shipment.shipped_at && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                زمان تحویل به پیک: {new Date(shipment.shipped_at).toLocaleDateString('fa-IR')}
              </span>
            )}
            {shipment.delivered_at && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تحویل داده شده: {new Date(shipment.delivered_at).toLocaleDateString('fa-IR')}
              </span>
            )}
          </div>
          {shipment.notes && (
            <span className="text-neutral-400 italic">
              یادداشت: {shipment.notes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
