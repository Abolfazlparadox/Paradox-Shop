'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Zap, Package, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { ShippingQuote } from '@/types/api';
import { formatCurrency } from '@/lib/utils/format';

interface ShippingMethodSelectorProps {
  methods: ShippingQuote[];
  selectedMethodId?: string | null;
  onSelectMethod: (method: ShippingQuote) => void;
  isLoading?: boolean;
}

export function ShippingMethodSelector({
  methods,
  selectedMethodId,
  onSelectMethod,
  isLoading = false,
}: ShippingMethodSelectorProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
        <Truck className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
        <p className="text-sm text-neutral-400">
          روش ارسالی برای این آدرس یافت نشد. لطفاً آدرس تحویل را بررسی کنید.
        </p>
      </div>
    );
  }

  const getMethodIcon = (code: string) => {
    switch (code) {
      case 'express':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'standard':
        return <Truck className="w-5 h-5 text-neutral-300" />;
      case 'freight':
        return <Package className="w-5 h-5 text-indigo-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const isSelected = selectedMethodId === method.method_id;
        const feeNumber = Number(method.shipping_fee);

        return (
          <motion.div
            key={method.method_id}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            onClick={() => onSelectMethod(method)}
            className={`relative p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
              isSelected
                ? 'bg-neutral-900/90 border-amber-500/40 shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/[0.04] border-white/[0.08]'
                  }`}
                >
                  {getMethodIcon(method.code)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm md:text-base font-semibold text-white">
                      {method.name}
                    </h4>
                    {method.is_free && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Sparkles className="w-3 h-3" />
                        ارسال رایگان
                      </span>
                    )}
                  </div>

                  {method.description && (
                    <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                      {method.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>زمان تحویل تقریبی: {method.estimated_delivery_text}</span>
                  </div>
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-left shrink-0">
                {method.is_free ? (
                  <div className="text-left">
                    <span className="text-sm md:text-base font-bold text-emerald-400">
                      رایگان
                    </span>
                    {Number(method.base_rate) > 0 && (
                      <div className="text-[11px] text-neutral-500 line-through">
                        {formatCurrency(method.base_rate)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-left">
                    <span className="text-sm md:text-base font-bold text-white tracking-tight">
                      {formatCurrency(method.shipping_fee)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Active Indicator Dot */}
            <div className="absolute top-4 left-4">
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
