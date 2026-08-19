'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, paymentsApi } from '@/lib/api/endpoints';
import { OrderDetail, PaymentDetail } from '@/types/api';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function PaymentTerminalPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.orderId as string;

  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedPayment, setCompletedPayment] = useState<PaymentDetail | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push(`/login?redirect=/payments/${orderId}`);
    }
  }, [isAuthenticated, isAuthLoading, orderId, router]);

  // Fetch Order Details
  const { data: order, isLoading: isOrderLoading, isError, error } = useQuery<OrderDetail>({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: Boolean(orderId && isAuthenticated),
  });

  // Mock Payment Mutation
  const payMutation = useMutation({
    mutationFn: (idempotencyKey?: string | void) =>
      paymentsApi.mockPay({
        order_id: orderId,
        idempotency_key: (typeof idempotencyKey === 'string' ? idempotencyKey : undefined) || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined),
      }),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCompletedPayment(payment);
    },
    onError: (err: any) => {
      const data = err.response?.data;
      let msg = 'Mock payment processing failed.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      setErrorMessage(msg);
    },
  });

  if (isAuthLoading || isOrderLoading) {
    return (
      <main className="py-16 bg-bg-primary min-h-screen">
        <Container size="sm" className="space-y-6">
          <div className="h-10 w-48 bg-bg-elevated rounded-md animate-pulse mx-auto" />
          <div className="h-96 bg-bg-elevated rounded-xl animate-pulse" />
        </Container>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="py-20 bg-bg-primary min-h-screen">
        <Container size="sm" className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-status-error/10 text-status-error flex items-center justify-center mx-auto border border-status-error/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display text-fg-primary">
            Order Not Found
          </h1>
          <p className="text-xs text-fg-secondary">
            {error?.message || 'The specified order could not be located or does not belong to your account.'}
          </p>
          <Link href="/dashboard/orders">
            <Button variant="outline" size="sm">
              Return to Orders
            </Button>
          </Link>
        </Container>
      </main>
    );
  }

  // If already paid / processed
  const isAlreadyPaid = order.status?.toLowerCase() !== 'pending' && !completedPayment;

  return (
    <main className="py-10 sm:py-16 bg-grid-pattern min-h-screen relative">
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      <Container size="sm" className="relative z-10 space-y-6">
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-elevated border border-border-accent text-[11px] font-mono text-fg-secondary shadow-subtle">
            <Terminal className="w-3.5 h-3.5" />
            <span>MOCK PAYMENT ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight">
            Order Clearance Terminal
          </h1>
        </div>

        {/* Success View */}
        {completedPayment && (
          <div className="bg-bg-elevated border border-border-accent rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-card">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                PAYMENT PROCESSED & VERIFIED
              </span>
              <h2 className="text-xl font-bold font-display text-fg-primary">
                Transaction Completed
              </h2>
              <p className="text-xs text-fg-secondary">
                Your payment has cleared through the mock banking network.
              </p>
            </div>

            {/* Receipt metadata */}
            <div className="p-4 rounded-lg bg-bg-secondary border border-border-subtle text-xs font-mono space-y-2 text-start divide-y divide-border-subtle/50">
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Transaction ID</span>
                <span className="font-semibold text-fg-primary">{completedPayment.transaction_id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Order Number</span>
                <span className="text-fg-primary">#{order.order_number}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Gateway Engine</span>
                <span className="text-fg-primary uppercase">{completedPayment.gateway}</span>
              </div>
              <div className="flex justify-between py-1 items-baseline">
                <span className="text-fg-muted">Amount Paid</span>
                <Price amount={completedPayment.amount} size="md" />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/dashboard/orders/${order.id}`} className="w-full sm:w-auto">
                <Button size="md" className="w-full text-xs" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View Order Status
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

        {/* Already Paid Notice */}
        {isAlreadyPaid && (
          <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-card">
            <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-fg-primary mx-auto border border-border-subtle">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-display text-fg-primary">
                Order is Already {order.status}
              </h2>
              <p className="text-xs text-fg-secondary">
                This order has already been cleared or updated and does not require payment.
              </p>
            </div>
            <Link href={`/dashboard/orders/${order.id}`}>
              <Button size="sm">View Order Details</Button>
            </Link>
          </div>
        )}

        {/* Active Payment Form */}
        {!completedPayment && !isAlreadyPaid && (
          <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 space-y-6 shadow-card">
            {errorMessage && (
              <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2.5 text-status-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Order Summary Snapshot */}
            <div className="space-y-3 pb-4 border-b border-border-subtle text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-fg-muted uppercase">Invoice Number</span>
                <span className="font-mono font-bold text-fg-primary">#{order.order_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-fg-muted uppercase">Items Count</span>
                <span className="text-fg-secondary font-mono">{order.items?.length || 0} line artifact(s)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-fg-muted uppercase">Shipping Destination</span>
                <span className="text-fg-secondary font-medium">
                  {order.shipping_address?.city}, {order.shipping_address?.province}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-border-subtle/50 text-sm">
                <span className="font-mono font-semibold text-fg-primary">Payable Balance</span>
                <Price amount={order.total} size="lg" />
              </div>
            </div>

            {/* Simulated Gateway Controls */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted block">
                Simulated Payment Execution
              </span>

              <Button
                size="lg"
                isLoading={payMutation.isPending}
                onClick={() => payMutation.mutate()}
                className="w-full text-xs font-semibold"
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Simulate Successful Payment Clearance
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setErrorMessage('Simulated Payment Failure: Transaction declined by banking test mock.');
                }}
                className="w-full text-xs text-status-error hover:bg-status-error/10 hover:border-status-error/40"
              >
                Simulate Payment Failure
              </Button>
            </div>

            {/* Guarantees */}
            <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-fg-muted">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Idempotency Locked
              </span>
              <Link href={`/dashboard/orders/${order.id}`} className="hover:text-fg-primary flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </Link>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
