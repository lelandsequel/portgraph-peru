'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

function NavLink({ href, icon, label, id, active, onClick }: { href: string; icon: string; label: string; id?: string; active?: boolean; onClick?: () => void }) {
  return (
    <a
      href={href}
      id={id}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 group min-h-[40px] relative ${
        active
          ? 'text-[#C6A86B] bg-[#C6A86B]/8'
          : 'text-[#8a9bb0] hover:text-[#e0e6ed] hover:bg-[#1a2030]'
      }`}
      style={{ fontFamily: 'Manrope' }}
    >
      {active && <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#C6A86B]" />}
      <span className={`material-symbols-outlined ${active ? 'text-[#C6A86B]' : 'text-[#6b7a8d] group-hover:text-[#e0e6ed]'}`} style={{ fontSize: '18px' }}>{icon}</span>
      <span className="font-light tracking-tight text-[13px]">{label}</span>
    </a>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-1.5">
      <p className="px-4 text-[9px] uppercase tracking-[0.15em] text-[#4C6A92] font-semibold" style={{ fontFamily: 'Manrope' }}>{label}</p>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      <div className="px-5 py-6 border-b border-[#1e2535]">
        <h1 className="text-base font-thin tracking-[0.25em] text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>NAUTILUS</h1>
        <p className="font-light tracking-tight text-[9px] uppercase text-[#6b7a8d] mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Global Commodity Intelligence</p>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <NavLink href="/" icon="hub" label="Overview" id="nav-dashboard" active={isActive('/')} onClick={() => setOpen(false)} />

        <SectionLabel label="Monitor" />
        <NavLink href="/terminal" icon="terminal" label="Terminal" id="nav-terminal" active={isActive('/terminal')} onClick={() => setOpen(false)} />
        <NavLink href="/lng" icon="local_gas_station" label="LNG" id="nav-lng" active={isActive('/lng')} onClick={() => setOpen(false)} />
        <NavLink href="/feed" icon="directions_boat" label="Vessels" id="nav-feed" active={isActive('/feed')} onClick={() => setOpen(false)} />
        <NavLink href="/global" icon="public" label="Global" id="nav-global" active={isActive('/global')} onClick={() => setOpen(false)} />

        <SectionLabel label="Intelligence" />
        <NavLink href="/flows" icon="swap_calls" label="Flows" id="nav-flows" active={isActive('/flows')} onClick={() => setOpen(false)} />
        <NavLink href="/signals" icon="notifications_active" label="Signals" id="nav-signals" active={isActive('/signals')} onClick={() => setOpen(false)} />
        <NavLink href="/demand" icon="trending_up" label="Demand" id="nav-demand" active={isActive('/demand')} onClick={() => setOpen(false)} />

        <SectionLabel label="Explore" />
        <NavLink href="/map" icon="map" label="Route Map" id="nav-map" active={isActive('/map')} onClick={() => setOpen(false)} />
      </nav>

      <div className="px-4 py-4 border-t border-[#1e2535]">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Systems operational</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 flex items-center px-4 z-50 bg-[#0B0E13]/90 backdrop-blur-md border-b border-[#1e2535]">
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center hover:bg-[#1a2030] transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[#8a9bb0]">menu</span>
        </button>
        <h1 className="ml-3 text-sm font-thin tracking-[0.25em] text-[#C6A86B]" style={{ fontFamily: 'Sora, Manrope' }}>NAUTILUS</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#C6A86B] bg-[#C6A86B]/10 px-2 py-0.5">LIVE</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full z-[70] flex flex-col w-64 bg-[#0f1319] border-r border-[#1e2535] transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center hover:bg-[#1a2030] transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[#6b7a8d]">close</span>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full z-40 flex-col w-56 bg-[#0f1319] border-r border-[#1e2535]">
        {navContent}
      </aside>
    </>
  );
}
