import type { Metadata } from 'next';
import './globals.css';
import GuidedTour from '@/components/GuidedTour';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'NAUTILUS — Global Commodity Intelligence',
  description: 'Confidence-scored commodity intelligence across global trade corridors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;600;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Sora:wght@300;400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0B0E13] text-[#e0e6ed] font-[Inter] overflow-hidden">
        <div className="flex h-screen">
          <Sidebar />

          {/* Main */}
          <div className="md:ml-56 flex flex-col flex-1 min-h-screen">
            {/* Top bar — desktop only */}
            <header className="hidden md:flex fixed top-0 right-0 left-56 h-12 justify-between items-center px-6 z-30 bg-[#0B0E13]/90 backdrop-blur-md border-b border-[#1e2535]">
              <div className="flex items-center flex-1 max-w-xl">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a8d] text-lg">search</span>
                  <input
                    className="w-full bg-[#121722] border border-[#1e2535] py-1.5 pl-10 pr-4 text-sm text-[#e0e6ed] placeholder:text-[#6b7a8d]/60 focus:outline-none focus:border-[#4C6A92]"
                    placeholder="Search vessels, ports, or shipments..."
                    type="text"
                    readOnly
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-[#C6A86B] bg-[#C6A86B]/10 px-3 py-1">LIVE</span>
                <div className="h-5 w-px bg-[#1e2535]" />
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-[#C6A86B] uppercase tracking-widest" style={{ fontFamily: 'Manrope' }}>Global Desk</p>
                  <p className="text-[9px] text-[#6b7a8d]">Commodity Analyst</p>
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="mt-12 md:mt-12 flex-1 overflow-y-auto bg-[#0B0E13]">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-[#1e2535] px-6 py-3 bg-[#0B0E13]">
              <p className="text-[10px] text-[#6b7a8d] text-center tracking-wide" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                NAUTILUS · Global Commodity Intelligence · Data: UN Comtrade · IMF PortWatch · VesselFinder · Updated daily
              </p>
            </footer>
          </div>
        </div>

        <GuidedTour />

        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
            font-size: 20px;
          }
        `}</style>
      </body>
    </html>
  );
}
