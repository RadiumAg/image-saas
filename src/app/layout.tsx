import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { TrpcProvider } from './trpc-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import './rc-image.scss';
import Script from 'next/script';

const geistSans = GeistSans;
geistSans.variable = '--font-geist-sans';

const geistMono = GeistMono;
geistMono.variable = '--font-geist-mono';

export const metadata: Metadata = {
  title: 'Image SaaS',
  description: 'A Image SaaS App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'development' && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster />
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
