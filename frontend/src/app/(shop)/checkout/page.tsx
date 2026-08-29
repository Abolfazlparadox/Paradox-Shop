'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { AddressSelector } from '@/features/address/components/AddressSelector';
import { useAuthStore } from '@/stores/auth';
import { notify } from '@/stores/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, ordersApi } from '@/lib/api/endpoints';
import { Address, Cart, OrderDetail, ShippingQuote } from '@/types/api';
import { useShippingQuotes } from '@/features/shipping/hooks/use-shipping';
import { ShippingMethodSelector } from '@/features/shipping/components/ShippingMethodSelector';
import { CouponInput } from '@/features/promotions/components/CouponInput';
import { formatCurrency } from '@/lib/utils/format';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  MapPin,
  FileText,
  AlertCircle,
  PackageCheck,
  Lock,
  CreditCard,
  Loader2,
  Truck,
  Sparkles,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingQuote | null>(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState<string | number | null>(null);
  const [notes, setNotes] = useState('');
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(4);

  // Fetch Cart
  const { data: cart, isLoading: isCartLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  // Fetch Dynamic Shipping Quotes based on destination and subtotal
  const { data: shippingMethods = [], isLoading: isShippingLoading } = useShippingQuotes(
    selectedAddress?.province,
    selectedAddress?.city,
    cart?.subtotal
  );

  // Auto-select first shipping method when loaded
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShippingMethod) {
      setSelectedShippingMethod(shippingMethods[0]);
    }
  }, [shippingMethods, selectedShippingMethod]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && step !== 3) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthenticated, isAuthLoading, router, step]);

  // Auto-redirect to payment gateway upon order creation in Step 3
  useEffect(() => {
    if (step !== 3 || !createdOrder?.id) return;

    setCountdown(4);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/payments/${createdOrder.id}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, createdOrder?.id, router]);

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  // Compute live total including calculated shipping fee and promotion/coupon discounts
  const subtotalNumber = Number(cart?.subtotal || 0);
  const promoDiscountNumber = Number(cart?.discount_amount || 0);
  const couponDiscountNumber = Number(appliedCouponDiscount || 0);
  const shippingFeeNumber = selectedShippingMethod ? Number(selectedShippingMethod.shipping_fee) : 0;
  const grandTotal = Math.max(0, subtotalNumber - promoDiscountNumber - couponDiscountNumber) + shippingFeeNumber;
  const totalSavingsNumber = promoDiscountNumber + couponDiscountNumber;

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (payload: {
      address_id: string;
      shipping_method_id?: string | null;
      notes?: string;
      coupon_code?: string | null;
    }) => ordersApi.checkout(payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setCreatedOrder(order);
      setStep(3);
      notify.success('Order Created', `Order #${order.order_number} has been created and stock locked.`);
    },
    onError: (err: any) => {
      // Invalidate cart to ensure authoritative sync if pricing/promotions changed
      queryClient.invalidateQueries({ queryKey: ['cart'] });

      const data = err.response?.data;
      let msg = 'Failed to create order.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.error?.message) msg = data.error.message;
        else if (data.detail) msg = data.detail;
        else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      setErrorMessage(msg);
      notify.error('Checkout Failed', msg);
    },
  });

  if (isAuthLoading || isCartLoading) {
    return (
      <main className="py-16 bg-bg-primary min-h-screen">
        <Container size="lg" className="space-y-8">
          <div className="h-10 w-48 bg-bg-elevated rounded-md animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-bg-elevated rounded-xl animate-pulse" />
            <div className="lg:col-span-4 h-80 bg-bg-elevated rounded-xl animate-pulse" />
          </div>
        </Container>
      </main>
    );
  }

  if (isEmpty && step !== 3) {
    return (
      <main className="py-20 bg-bg-primary min-h-screen">
        <Container size="sm" className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted mx-auto border border-border-subtle">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display text-fg-primary">
            Your Cart is Empty
          </h1>
          <p className="text-xs text-fg-secondary">
            Please add items to your cart before proceeding to checkout.
          </p>
          <Link href="/products" className="inline-block pt-2">
            <Button size="sm">Explore Catalog</Button>
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-10 sm:py-16 bg-bg-primary min-h-screen">
      <Container size="lg" className="space-y-8">
        {/* Header & Step Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ATOMIC CHECKOUT ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight">
              Order Acquisition & Dispatch
            </h1>
          </div>

          {/* Steps Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full border',
                step === 1
                  ? 'bg-accent text-accent-fg border-accent font-semibold shadow-subtle'
                  : step > 1
                  ? 'bg-bg-secondary text-fg-primary border-border-accent'
                  : 'bg-bg-elevated text-fg-muted border-border-subtle'
              )}
            >
              <span>1</span>
              <span>Address</span>
            </div>
            <span className="text-fg-muted">→</span>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full border',
                step === 2
                  ? 'bg-accent text-accent-fg border-accent font-semibold shadow-subtle'
                  : step > 2
                  ? 'bg-bg-secondary text-fg-primary border-border-accent'
                  : 'bg-bg-elevated text-fg-muted border-border-subtle'
              )}
            >
              <span>2</span>
              <span>Review</span>
            </div>
            <span className="text-fg-muted">→</span>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full border',
                step === 3
                  ? 'bg-accent text-accent-fg border-accent font-semibold shadow-subtle'
                  : 'bg-bg-elevated text-fg-muted border-border-subtle'
              )}
            >
              <span>3</span>
              <span>Created</span>
            </div>
          </div>
        </div>

        {/* Step 3: Success Screen */}
        {step === 3 && createdOrder && (
          <div className="max-w-2xl mx-auto bg-bg-elevated border border-border-accent rounded-2xl p-8 text-center space-y-6 shadow-card">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <PackageCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                ORDER SUCCESSFULLY CREATED
              </span>
              <h2 className="text-2xl font-bold font-display text-fg-primary">
                Order #{createdOrder.order_number}
              </h2>
              <p className="text-xs text-fg-secondary max-w-md mx-auto">
                Stock has been atomically locked. Your items are prepared for dispatch upon payment clearance.
              </p>
            </div>

            {/* Countdown / Redirect Banner */}
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Redirecting to Payment Terminal</span>
                </div>
                <span className="font-bold text-fg-primary">
                  {countdown}s
                </span>
              </div>
              <div className="w-full bg-bg-secondary h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, ((4 - countdown) / 4) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-bg-secondary rounded-lg border border-border-subtle grid grid-cols-2 gap-4 text-xs font-mono text-start">
              <div>
                <span className="text-fg-muted block text-[10px]">TOTAL AMOUNT</span>
                <Price amount={createdOrder.total} size="md" />
              </div>
              <div>
                <span className="text-fg-muted block text-[10px]">STATUS</span>
                <span className="font-semibold text-fg-primary uppercase">
                  {createdOrder.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/payments/${createdOrder.id}`} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full text-xs font-semibold"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Payment Now
                </Button>
              </Link>
              <Link href="/products" className="w-full sm:w-auto">
                <Button variant="outline" size="md" className="w-full text-xs">
                  Continue Browsing
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Steps 1 & 2: Interactive Checkout Form */}
        {step !== 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Step Form Column */}
            <div className="lg:col-span-8 space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-lg bg-status-error/10 border border-status-error/20 flex items-start gap-3 text-status-error text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Delivery Address Selection */}
              {step === 1 && (
                <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 space-y-6 shadow-card">
                  <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
                    <MapPin className="w-4 h-4 text-fg-primary" />
                    <h2 className="text-sm font-semibold font-display text-fg-primary uppercase tracking-wider">
                      Step 1: Shipping Destination
                    </h2>
                  </div>

                  <AddressSelector
                    selectedAddressId={selectedAddress?.id || null}
                    onSelectAddress={(addr) => {
                      setSelectedAddress(addr);
                      setErrorMessage(null);
                    }}
                  />

                  <div className="pt-4 border-t border-border-subtle flex justify-end">
                    <Button
                      size="md"
                      disabled={!selectedAddress}
                      onClick={() => setStep(2)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="text-xs font-semibold"
                    >
                      Proceed to Review
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Review & Order Notes */}
              {step === 2 && (
                <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 space-y-6 shadow-card">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-fg-primary" />
                      <h2 className="text-sm font-semibold font-display text-fg-primary uppercase tracking-wider">
                        Step 2: Review & Order Dispatch Notes
                      </h2>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-mono text-fg-muted hover:text-fg-primary flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Address
                    </button>
                  </div>

                  {/* Selected Address Snapshot */}
                  {selectedAddress && (
                    <div className="p-4 rounded-lg bg-bg-secondary border border-border-subtle text-xs space-y-1">
                      <span className="font-mono text-[10px] uppercase text-fg-muted block">
                        DELIVERING TO ({selectedAddress.title})
                      </span>
                      <div className="font-semibold text-fg-primary">
                        {selectedAddress.recipient_name} ({selectedAddress.recipient_phone})
                      </div>
                      <p className="text-fg-secondary">{selectedAddress.address_line}</p>
                      <span className="font-mono text-[10px] text-fg-muted block">
                        {selectedAddress.province}, {selectedAddress.city} • Postal Code:{' '}
                        {selectedAddress.postal_code}
                      </span>
                    </div>
                  )}

                  {/* Shipping & Delivery Method Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-fg-primary" />
                      <label className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold">
                        Delivery Method & Speed
                      </label>
                    </div>
                    <ShippingMethodSelector
                      methods={shippingMethods}
                      selectedMethodId={selectedShippingMethod?.method_id || null}
                      onSelectMethod={(method) => setSelectedShippingMethod(method)}
                      isLoading={isShippingLoading}
                    />
                  </div>

                  {/* Promotional Voucher / Coupon Section */}
                  <div className="p-4 rounded-lg bg-bg-secondary border border-border-subtle">
                    <CouponInput
                      appliedCode={appliedCouponCode}
                      appliedDiscount={couponDiscountNumber > 0 ? couponDiscountNumber : null}
                      onApplySuccess={(code, data) => {
                        setAppliedCouponCode(code);
                        setAppliedCouponDiscount(data.discount_amount);
                        setErrorMessage(null);
                      }}
                      onRemove={() => {
                        setAppliedCouponCode(null);
                        setAppliedCouponDiscount(null);
                      }}
                      disabled={checkoutMutation.isPending}
                    />
                  </div>

                  {/* Order Notes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono uppercase tracking-wider text-fg-primary font-medium">
                      Special Delivery Instructions / Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Leave with building security, call upon arrival..."
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(1)}
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Back
                    </Button>
                    <Button
                      size="lg"
                      isLoading={checkoutMutation.isPending}
                      disabled={checkoutMutation.isPending || !selectedAddress}
                      onClick={() => {
                        if (!selectedAddress) return;
                        checkoutMutation.mutate({
                          address_id: selectedAddress.id,
                          shipping_method_id: selectedShippingMethod?.method_id,
                          notes: notes.trim() || undefined,
                          coupon_code: appliedCouponCode || undefined,
                        });
                      }}
                      rightIcon={<Check className="w-4 h-4" />}
                      className="text-xs font-semibold"
                    >
                      Confirm and Create Order
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sticky Order Snapshot Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 space-y-6 shadow-card sticky top-24">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold">
                    Cart Snapshot ({items.length})
                  </h3>
                  {totalSavingsNumber > 0 && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Save {formatCurrency(totalSavingsNumber, 'Rial')}
                    </span>
                  )}
                </div>

                {/* Items preview list */}
                <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-border-subtle/50 pe-1">
                  {items.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                      <div className="relative w-12 h-14 rounded bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-mono text-[9px] text-fg-muted">
                        {item.product?.primary_image ? (
                          <Image
                            src={item.product.primary_image}
                            alt={item.product.name}
                            fill
                            className="object-cover object-center"
                          />
                        ) : (
                          'PX'
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-fg-primary font-display truncate">
                          {item.product?.name}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
                          <span>Qty: {item.quantity}</span>
                          <Price
                            amount={item.total_price}
                            originalAmount={item.is_discounted ? item.original_total_price : null}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="pt-4 border-t border-border-subtle space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-fg-secondary">
                    <span>Artifacts Subtotal</span>
                    <Price amount={subtotalNumber} size="sm" />
                  </div>

                  {promoDiscountNumber > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Promotion Discount
                      </span>
                      <span>-{formatCurrency(promoDiscountNumber, 'Rial')}</span>
                    </div>
                  )}

                  {couponDiscountNumber > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Coupon ({appliedCouponCode})
                      </span>
                      <span>-{formatCurrency(couponDiscountNumber, 'Rial')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-fg-secondary">
                    <span>Shipping Fee</span>
                    {selectedShippingMethod ? (
                      selectedShippingMethod.is_free ? (
                        <span className="text-emerald-400 font-semibold">Free Delivery</span>
                      ) : (
                        <Price amount={selectedShippingMethod.shipping_fee} size="sm" />
                      )
                    ) : (
                      <span className="text-fg-muted">Calculated at dispatch</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline text-fg-primary font-bold">
                    <span>Final Order Total</span>
                    <Price amount={grandTotal.toString()} size="md" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle/60 text-[11px] font-mono text-fg-muted flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Atomic stock reservation on submit</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
