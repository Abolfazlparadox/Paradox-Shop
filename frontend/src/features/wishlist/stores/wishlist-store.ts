import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuestWishlistState {
  guestProductIds: string[];
  addGuestItem: (productId: string) => void;
  removeGuestItem: (productId: string) => void;
  toggleGuestItem: (productId: string) => boolean;
  isGuestInWishlist: (productId: string) => boolean;
  clearGuestWishlist: () => void;
}

export const useGuestWishlistStore = create<GuestWishlistState>()(
  persist(
    (set, get) => ({
      guestProductIds: [],
      addGuestItem: (productId: string) => {
        set((state) => {
          if (state.guestProductIds.includes(productId)) {
            return state;
          }
          return { guestProductIds: [...state.guestProductIds, productId] };
        });
      },
      removeGuestItem: (productId: string) => {
        set((state) => ({
          guestProductIds: state.guestProductIds.filter((id) => id !== productId),
        }));
      },
      toggleGuestItem: (productId: string) => {
        const { guestProductIds } = get();
        const exists = guestProductIds.includes(productId);
        if (exists) {
          set({ guestProductIds: guestProductIds.filter((id) => id !== productId) });
          return false;
        } else {
          set({ guestProductIds: [...guestProductIds, productId] });
          return true;
        }
      },
      isGuestInWishlist: (productId: string) => {
        return get().guestProductIds.includes(productId);
      },
      clearGuestWishlist: () => {
        set({ guestProductIds: [] });
      },
    }),
    {
      name: 'paradox_guest_wishlist',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);
