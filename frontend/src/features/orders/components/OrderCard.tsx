'use client';

import React from 'react';
import Link from 'next/link';
import { OrderListItem, OrderStatus } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/format';
import { Package, ArrowRight, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface OrderCardProps {
  order: OrderListItem;
  className?: string;
}

export function OrderCard({ order, className }: OrderCardProps) {
  const normalizedStatus = (order.status || '').toUpperCase() as OrderStatus;

  const getBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'PROCESSING':
        return 'mono';
      case 'SHIPPED':
        return 'outline';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'error';
      default:
        return 'mono';
    }
  };

  const isPending = normalizedStatus === 'PENDING';

  return (
    <div
      className={cn(
        'p-5 rounded-xl bg-bg-elevated border border-border-subtle hover:border-border-accent transition-all shadow-card space-y-4 text-start',
        className
      )}
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-muted shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold font-mono text-fg-primary block">
              #{order.order_number}
            </span>
            <span className="text-[11px] font-mono text-fg-muted">
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant={getBadgeVariant(normalizedStatus)} size="sm">
            {normalizedStatus}
          </Badge>
        </div>
      </div>

      {/* Financial Overview & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-fg-muted uppercase block">
            Total Amount
          </span>
          <Price amount={order.total} size="md" />
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Link href={`/payments/${order.id}`}>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Pay Now
              </Button>
            </Link>
          )}

          <Link href={`/dashboard/orders/${order.id}`}>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Order Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
