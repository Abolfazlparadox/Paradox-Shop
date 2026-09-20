import { Metadata } from 'next';
import { WishlistView } from '@/features/wishlist/components/WishlistView';

export const metadata: Metadata = {
  title: 'Saved Items & Wishlist | Paradox Client Dashboard',
  description: 'Manage your saved artifacts and wishlist items directly from your dashboard.',
};

export default function DashboardWishlistPage() {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card">
      <WishlistView />
    </div>
  );
}
