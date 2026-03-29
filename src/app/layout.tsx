import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PortGraph Peru — Maritime Trade Intelligence',
  description: 'Confidence-scored maritime trade intelligence for Peru\'s export corridors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">
                    PG
                  </div>
                  <span className="font-semibold text-sm tracking-wide">
                    PortGraph <span className="text-gray-400">Peru</span>
                  </span>
                </Link>
                <div className="hidden sm:flex items-center gap-1">
                  <Link
                    href="/"
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    Intelligence
                  </Link>
                  <Link
                    href="/feed"
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    Trade Feed
                  </Link>
                  <Link
                    href="/map"
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    Route Map
                  </Link>
                  <Link
                    href="/entities"
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    Entities
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-mono">Phase 2</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
