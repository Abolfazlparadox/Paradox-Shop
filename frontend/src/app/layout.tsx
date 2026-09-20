import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'PARADOX SHOP — Impossible Minimalism',
    template: '%s | PARADOX SHOP',
  },
  description:
    'Engineered luxury commerce platform. Precision design, architectural geometry, and high-performance lifestyle artifacts.',
  keywords: ['Paradox Shop', 'Luxury Commerce', 'Minimalism', 'Precision Design', 'Engineered Lifestyle'],
  authors: [{ name: 'Paradox Team' }],
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'PARADOX SHOP — Impossible Minimalism',
    description: 'Engineered luxury commerce platform. Precision design, architectural geometry, and curated artifacts.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Paradox Shop',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-primary text-fg-primary font-sans antialiased flex flex-col justify-between selection:bg-accent selection:text-accent-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
