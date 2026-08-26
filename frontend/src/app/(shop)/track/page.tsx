'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useTrackShipment } from '@/features/shipping/hooks/use-shipping';
import { ShipmentTrackingCard } from '@/features/shipping/components/ShipmentTrackingCard';
import { Truck, Search, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function TrackOrderPage() {
  const [searchInput, setSearchInput] = useState('');
  const [queryCode, setQueryCode] = useState('');

  const { data: shipment, isLoading, isError, error } = useTrackShipment(queryCode);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQueryCode(searchInput.trim());
    }
  };

  return (
    <main className="py-12 md:py-20 bg-bg-primary min-h-screen text-start">
      <Container size="md" className="space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20">
            <Truck className="w-3.5 h-3.5" />
            <span>REAL-TIME COURIER DISPATCH RADAR</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-display text-fg-primary tracking-tight">
            سامانه آنلاین رهگیری مرسولات پارادوکس
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
            کد رهگیری مرسوله اختصاصی خود را (مانند <code className="font-mono text-amber-400">PDX-XXXXXXXX</code>) وارد کنید تا از آخرین وضعیت بسته‌بندی، ارسال و موقعیت مکانی مرسوله مطلع شوید.
          </p>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={handleSearch}
          className="relative max-w-xl mx-auto flex items-center bg-neutral-900/80 border border-white/[0.1] focus-within:border-amber-400/60 rounded-2xl p-1.5 shadow-2xl transition-all"
        >
          <div className="ps-3.5 pe-2 text-neutral-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="کد رهگیری مرسوله (مثال: PDX-A1B2C3D4)"
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-mono py-2.5 px-2 text-start"
          />
          <Button
            type="submit"
            size="md"
            variant="primary"
            isLoading={isLoading}
            disabled={!searchInput.trim() || isLoading}
            className="shrink-0 text-xs font-semibold rounded-xl px-5"
          >
            رهگیری بسته
          </Button>
        </form>

        {/* Live Result Area */}
        {queryCode && (
          <div className="space-y-6 pt-4">
            {isLoading && (
              <div className="h-64 rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            )}

            {isError && (
              <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">مرسوله‌ای با این کد یافت نشد</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  لطفاً صحت کد رهگیری <span className="font-mono text-red-300">{queryCode}</span> را مجدداً بررسی کرده و اطمینان حاصل نمایید که کد به درستی وارد شده است.
                </p>
              </div>
            )}

            {shipment && <ShipmentTrackingCard shipment={shipment} />}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10 border-t border-white/[0.06]">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-white">بسته‌بندی ایمن و ضدضربه</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              تمامی کالاهای گران‌بها در بسته‌بندی هاردباکس با پلمب امنیتی ارسال می‌گردند.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-white">بیمه کامل ۱۰۰٪ مرسولات</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              کلیه محموله‌ها از مبدأ انبار تا لحظه امضای تحویل نزد مشتری، تحت پوشش بیمه کامل هستند.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-400/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-white">ارسال اکسپرس اختصاصی</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              سفارش‌های تهران و کلان‌شهرها در کوتاه‌ترین زمان کاری توسط سفیران آموزش‌دیده تحویل می‌شوند.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
