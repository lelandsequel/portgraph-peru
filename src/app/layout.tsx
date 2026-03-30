import type { Metadata } from 'next';
import './globals.css';
import GuidedTour from '@/components/GuidedTour';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'NAUTILUS — Peru Maritime Intelligence',
  description: 'Confidence-scored maritime trade intelligence for Peru\'s export corridors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;600;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Sora:wght@300;400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f7fafc] text-[#181c1e] font-[Inter] overflow-hidden">
        <div className="flex h-screen">
          <Sidebar />

          {/* Main */}
          <div className="md:ml-64 flex flex-col flex-1 min-h-screen">
            {/* Top bar — desktop only */}
            <header className="hidden md:flex fixed top-0 right-0 left-64 h-16 justify-between items-center px-8 z-30 bg-white/80 backdrop-blur-md shadow-sm shadow-[#e0e3e5]/50">
              <div className="flex items-center flex-1 max-w-xl">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#72777e] text-lg">search</span>
                  <input
                    className="w-full bg-[#f1f4f6] border-none rounded-full py-2 pl-10 pr-4 text-sm placeholder:text-[#72777e]/60 focus:outline-none focus:ring-2 focus:ring-[#006a62]/20"
                    placeholder="Search vessels, ports, or shipments..."
                    type="text"
                    readOnly
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-[#006a62] bg-[#006a62]/10 px-3 py-1 rounded-full">LIVE</span>
                <div className="h-6 w-px bg-[#e0e3e5]" />
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#00263f] uppercase tracking-tighter" style={{ fontFamily: 'Manrope' }}>Peru Desk</p>
                  <p className="text-[10px] text-[#72777e]">Maritime Analyst</p>
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="mt-14 md:mt-16 flex-1 overflow-y-auto bg-[#f7fafc]">
              {children}
            </main>
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
