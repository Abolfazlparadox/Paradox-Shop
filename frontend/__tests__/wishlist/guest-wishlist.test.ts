import { describe, it, expect, beforeEach } from 'vitest';
import { useGuestWishlistStore } from '@/features/wishlist/stores/wishlist-store';

describe('Guest Wishlist Store', () => {
  beforeEach(() => {
    useGuestWishlistStore.getState().clearGuestWishlist();
  });

  it('initializes with an empty list of product IDs', () => {
    const state = useGuestWishlistStore.getState();
    expect(state.guestProductIds).toEqual([]);
  });

  it('adds items to guest wishlist and prevents duplicates', () => {
    const { addGuestItem } = useGuestWishlistStore.getState();
    const testId = '11111111-1111-1111-1111-111111111111';

    addGuestItem(testId);
    expect(useGuestWishlistStore.getState().guestProductIds).toEqual([testId]);

    // Adding same product again should not duplicate
    addGuestItem(testId);
    expect(useGuestWishlistStore.getState().guestProductIds).toEqual([testId]);
  });

  it('removes item from guest wishlist', () => {
    const { addGuestItem, removeGuestItem } = useGuestWishlistStore.getState();
    const id1 = '11111111-1111-1111-1111-111111111111';
    const id2 = '22222222-2222-2222-2222-222222222222';

    addGuestItem(id1);
    addGuestItem(id2);
    expect(useGuestWishlistStore.getState().guestProductIds.length).toBe(2);

    removeGuestItem(id1);
    expect(useGuestWishlistStore.getState().guestProductIds).toEqual([id2]);
  });

  it('toggles items correctly in guest wishlist', () => {
    const { toggleGuestItem, isGuestInWishlist } = useGuestWishlistStore.getState();
    const testId = '33333333-3333-3333-3333-333333333333';

    expect(isGuestInWishlist(testId)).toBe(false);

    const added = toggleGuestItem(testId);
    expect(added).toBe(true);
    expect(isGuestInWishlist(testId)).toBe(true);

    const removed = toggleGuestItem(testId);
    expect(removed).toBe(false);
    expect(isGuestInWishlist(testId)).toBe(false);
  });

  it('clears all items from guest wishlist', () => {
    const { addGuestItem, clearGuestWishlist } = useGuestWishlistStore.getState();
    addGuestItem('id-1');
    addGuestItem('id-2');
    expect(useGuestWishlistStore.getState().guestProductIds.length).toBe(2);

    clearGuestWishlist();
    expect(useGuestWishlistStore.getState().guestProductIds).toEqual([]);
  });
});
