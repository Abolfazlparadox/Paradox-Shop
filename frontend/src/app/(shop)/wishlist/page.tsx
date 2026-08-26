import { Metadata } from 'next';
import { WishlistView } from '@/features/wishlist/components/WishlistView';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Wishlist | Paradox Shop',
  description: 'View and manage your curated list of saved artifacts and products.',
};

export default function WishlistPage() {
  return (
    <main className="py-12 md:py-16">
      <Container>
        <WishlistView />
      </Container>
    </main>
  );
}
