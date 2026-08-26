'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { wishlistApi } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth';
import { notify } from '@/stores/notifications';
import { useGuestWishlistStore } from '../stores/wishlist-store';
import { AddWishlistItemRequest, Wishlist } from '@/types/api';

export const WISHLIST_QUERY_KEY = ['wishlist'];

export function useWishlist() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const guestProductIds = useGuestWishlistStore((state) => state.guestProductIds);
  const addGuestItem = useGuestWishlistStore((state) => state.addGuestItem);
  const removeGuestItem = useGuestWishlistStore((state) => state.removeGuestItem);
  const toggleGuestItem = useGuestWishlistStore((state) => state.toggleGuestItem);
  const isGuestInWishlist = useGuestWishlistStore((state) => state.isGuestInWishlist);
  const clearGuestWishlist = useGuestWishlistStore((state) => state.clearGuestWishlist);

  // 1. Authenticated Server Wishlist Query
  const {
    data: serverWishlist,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Wishlist>({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: () => wishlistApi.getWishlist(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });

  // 2. Auto-merge Guest Wishlist into Server on Login
  useEffect(() => {
    if (isAuthenticated && guestProductIds.length > 0) {
      const idsToMerge = [...guestProductIds];
      wishlistApi
        .mergeWishlist({ product_ids: idsToMerge })
        .then(() => {
          clearGuestWishlist();
          queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
          notify.info(
            'Wishlist Synchronized',
            'Your saved items were merged into your account.'
          );
        })
        .catch((err) => {
          console.error('Failed to merge guest wishlist:', err);
        });
    }
  }, [isAuthenticated, guestProductIds, clearGuestWishlist, queryClient]);

  // 3. Add Item Mutation
  const addMutation = useMutation({
    mutationFn: (data: AddWishlistItemRequest) => wishlistApi.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      notify.success(
        'Saved to Wishlist',
        'Product has been saved for future consideration.'
      );
    },
    onError: () => {
      notify.error('Wishlist Error', 'Could not add product to wishlist.');
    },
  });

  // 4. Remove Item by ID Mutation
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => wishlistApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      notify.info('Removed from Wishlist', 'Product removed from your saved list.');
    },
    onError: () => {
      notify.error('Wishlist Error', 'Failed to remove item.');
    },
  });

  // 5. Remove by Product ID Toggle Mutation
  const removeByProductMutation = useMutation({
    mutationFn: (data: AddWishlistItemRequest) => wishlistApi.removeByProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      notify.info('Removed from Wishlist', 'Product removed from your saved list.');
    },
  });

  // 6. Clear Wishlist Mutation
  const clearMutation = useMutation({
    mutationFn: () => wishlistApi.clearWishlist(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      notify.info('Wishlist Cleared', 'All items removed from your wishlist.');
    },
  });

  // 7. Check if Product is in Wishlist (Unified for Authenticated and Guest)
  const isProductSaved = (productId: string, variantId?: string): boolean => {
    if (!isAuthenticated) {
      return isGuestInWishlist(productId);
    }
    if (!serverWishlist?.items) return false;
    return serverWishlist.items.some((item) => {
      if (item.product.id !== productId) return false;
      if (variantId && item.variant?.id !== variantId) return false;
      return true;
    });
  };

  // 8. Toggle Save Action
  const toggleSave = async (productId: string, variantId?: string) => {
    const currentlySaved = isProductSaved(productId, variantId);

    if (!isAuthenticated) {
      // Guest local storage toggle
      const wasAdded = toggleGuestItem(productId);
      if (wasAdded) {
        notify.success('Saved to Wishlist', 'Item saved locally. Log in to sync across devices.');
      } else {
        notify.info('Removed from Wishlist', 'Item removed from your saved list.');
      }
      return !currentlySaved;
    }

    if (currentlySaved) {
      await removeByProductMutation.mutateAsync({ product_id: productId, variant_id: variantId });
      return false;
    } else {
      await addMutation.mutateAsync({ product_id: productId, variant_id: variantId });
      return true;
    }
  };

  const totalItemsCount = isAuthenticated
    ? serverWishlist?.items_count ?? 0
    : guestProductIds.length;

  return {
    wishlist: serverWishlist,
    items: serverWishlist?.items ?? [],
    totalItemsCount,
    isLoading,
    isError,
    error,
    refetch,
    isProductSaved,
    toggleSave,
    addItem: addMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    clearWishlist: clearMutation.mutateAsync,
    isMutating:
      addMutation.isPending ||
      removeMutation.isPending ||
      removeByProductMutation.isPending ||
      clearMutation.isPending,
  };
}
