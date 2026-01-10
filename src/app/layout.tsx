import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { TrpcProvider } from './trpc-provider';
import { Toaster } from '@/components/ui/Sonner';
import './globals.css';
import './rc-image.scss';

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster></Toaster>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
