import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'veritas-pytest - AI-Powered Test Generation',
  description: 'Generate comprehensive pytest tests for your Python code',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-xl font-bold text-sage-700">
                  veritas-pytest
                </Link>
                <div className="flex gap-6">
                  <Link
                    href="/"
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                  >
                    New Run
                  </Link>
                  <Link
                    href="/history"
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                  >
                    History
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}
