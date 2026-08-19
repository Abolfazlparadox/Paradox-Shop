import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Payment Terminal',
  description: 'Simulated mock payment clearance and receipt verification.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
