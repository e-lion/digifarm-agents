import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/components/providers/QueryProvider'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DigiFarm Agent',
  description: 'Mobile-first tool for DigiFarm sales agents',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <PwaInstallPrompt />
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}
