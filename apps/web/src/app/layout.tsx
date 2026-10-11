import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { bootScript } from '@simw/sdk';
import { Providers } from '@/components/providers';
import { SITE_ID } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SeeItMyWay: what does your browser tell websites?',
    template: '%s · SeeItMyWay',
  },
  description:
    'Your browser may already be telling websites how you’d like them to behave. See what yours says, no login, no tracking.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0e13' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the visitor's last-known preferences before first paint: no dark-mode flashbang. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript(SITE_ID) }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
