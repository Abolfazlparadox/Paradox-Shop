import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Shop Project - E-Commerce Platform',
  description: 'Production-grade Modular Monolith E-Commerce Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
