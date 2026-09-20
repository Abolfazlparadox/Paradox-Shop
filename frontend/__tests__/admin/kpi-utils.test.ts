// ==========================================
// Admin KPI & Financial Calculation Unit Tests
// ==========================================

import { describe, test, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils/format';

describe('Admin KPI & Telemetry Utilities', () => {
  function calculateAOV(totalRevenue: number, totalOrders: number): number {
    if (totalOrders <= 0) return 0;
    return Math.round(totalRevenue / totalOrders);
  }

  function calculateTargetProgress(currentRevenue: number, targetRevenue: number): number {
    if (targetRevenue <= 0) return 0;
    return Math.min(100, (currentRevenue / targetRevenue) * 100);
  }

  test('Calculates Average Order Value correctly', () => {
    const revenue = 184500000;
    const orders = 142;
    const aov = calculateAOV(revenue, orders);
    expect(aov).toBe(1299296);
  });

  test('Calculates Target Revenue Progress percentage properly', () => {
    const current = 184500000;
    const target = 220000000;
    const progress = calculateTargetProgress(current, target);
    expect(progress).toBeCloseTo(83.86, 1);
  });

  test('Formats currency with Toman correctly', () => {
    const formatted = formatCurrency(12500000, 'Toman');
    expect(formatted).toContain('1,250,000');
    expect(formatted).toContain('Toman');
  });
});
