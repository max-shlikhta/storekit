import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Storekit',
  description: 'A multi-store back office: catalog, stock and orders.',
  robots: { index: false, follow: false },
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body className="min-h-screen antialiased">{children}</body>
  </html>
);

export default RootLayout;
