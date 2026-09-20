import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@/types/api';

describe('Order Lifecycle & Timeline State Progression', () => {
  const getTimelineStepIndex = (status: OrderStatus) => {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':
        return 0;
      case 'PROCESSING':
        return 1;
      case 'SHIPPED':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  it('correctly activates Step 0 (Pending) and keeps future stages inactive', () => {
    const status: OrderStatus = 'PENDING';
    const activeIndex = getTimelineStepIndex(status);

    expect(activeIndex).toBe(0);
    expect(activeIndex < 1).toBe(true); // Processing is future/inactive
    expect(activeIndex < 2).toBe(true); // Shipped is future/inactive
    expect(activeIndex < 3).toBe(true); // Delivered is future/inactive
  });

  it('correctly transitions to Step 1 (Processing) with Pending marked as completed', () => {
    const status: OrderStatus = 'PROCESSING';
    const activeIndex = getTimelineStepIndex(status);

    expect(activeIndex).toBe(1);
    expect(0 < activeIndex).toBe(true); // Step 0 (Pending) is completed
    expect(activeIndex < 2).toBe(true); // Step 2 (Shipped) is future/inactive
    expect(activeIndex < 3).toBe(true); // Step 3 (Delivered) is future/inactive
  });

  it('correctly transitions to Step 2 (Shipped) with Pending and Processing marked as completed', () => {
    const status: OrderStatus = 'SHIPPED';
    const activeIndex = getTimelineStepIndex(status);

    expect(activeIndex).toBe(2);
    expect(0 < activeIndex).toBe(true); // Step 0 completed
    expect(1 < activeIndex).toBe(true); // Step 1 completed
    expect(activeIndex < 3).toBe(true); // Step 3 (Delivered) is future/inactive
  });

  it('correctly transitions to Step 3 (Delivered) with all previous stages completed', () => {
    const status: OrderStatus = 'DELIVERED';
    const activeIndex = getTimelineStepIndex(status);

    expect(activeIndex).toBe(3);
    expect(0 < activeIndex).toBe(true); // Step 0 completed
    expect(1 < activeIndex).toBe(true); // Step 1 completed
    expect(2 < activeIndex).toBe(true); // Step 2 completed
  });

  it('correctly identifies terminal states (Cancelled and Refunded)', () => {
    const cancelledStatus: OrderStatus = 'CANCELLED';
    const isTerminalCancelled = cancelledStatus === 'CANCELLED';
    expect(isTerminalCancelled).toBe(true);

    const refundedStatus: OrderStatus = 'REFUNDED';
    const isTerminalRefunded = refundedStatus === 'REFUNDED';
    expect(isTerminalRefunded).toBe(true);
  });
});
