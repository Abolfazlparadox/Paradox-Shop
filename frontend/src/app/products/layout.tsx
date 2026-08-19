import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catalog & Engineering Artifacts',
  description:
    'Discover precision horology, architectural artifacts, Grade 5 titanium hardware, and minimalist engineering lifestyle products.',
  openGraph: {
    title: 'Catalog & Engineering Artifacts | PARADOX SHOP',
    description:
      'Curated catalog of precision artifacts, horology, and high-performance lifestyle engineering.',
    type: 'website',
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
