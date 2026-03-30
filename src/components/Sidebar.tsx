'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

function NavLink({ href, icon, label, id, onClick }: { href: string; icon: string; label: string; id?: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      id={id}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#42474e] hover:text-[#00263f] hover:bg-[#e5e9eb] transition-colors duration-200 group min-h-[44px]"
      style={{ fontFamily: 'Manrope' }}
    >
      <span className="material-symbols-outlined text-[#72777e] group-hover:text-[#00263f]">{icon}</span>
      <span className="font-light tracking-tight text-sm">{label}</span>
    </a>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navContent = (
    <>
      <div className="px-8 py-10">
        <h1 className="text-xl font-thin tracking-widest text-[#00263f]" style={{ fontFamily: 'Sora, Manrope' }}>NAUTILUS</h1>
        <p className="font-light tracking-tight text-xs uppercase opacity-60 mt-0.5" style={{ fontFamily: 'Manrope' }}>Maritime Intelligence</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <NavLink href="/" icon="dashboard" label="Dashboard" id="nav-dashboard" onClick={() => setOpen(false)} />
        <NavLink href="/feed" icon="directions_boat" label="Trade Feed" id="nav-feed" onClick={() => setOpen(false)} />
        <NavLink href="/map" icon="anchor" label="Route Map" id="nav-map" onClick={() => setOpen(false)} />
        <NavLink href="/signals" icon="notifications_active" label="Signals" id="nav-signals" onClick={() => setOpen(false)} />

        <div className="pt-8 pb-2">
          <p className="px-4 text-[10px] uppercase tracking-widest text-[#72777e] font-bold" style={{ fontFamily: 'Manrope' }}>Intelligence</p>
        </div>
        <NavLink href="/?tab=query" icon="search" label="Query Engine" onClick={() => setOpen(false)} />
      </nav>

      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
          <span className="material-symbols-outlined text-[#72777e] text-lg">verified_user</span>
          <div>
            <p className="text-xs font-semibold text-[#00263f] uppercase tracking-tighter" style={{ fontFamily: 'Manrope' }}>Phase 3</p>
            <p className="text-[10px] text-[#72777e]">Live</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center px-4 z-50 bg-white/80 backdrop-blur-md shadow-sm shadow-[#e0e3e5]/50">
        <button
          onClick={() => setOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[#e5e9eb] transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[#42474e]">menu</span>
        </button>
        <h1 className="ml-3 text-base font-thin tracking-widest text-[#00263f]" style={{ fontFamily: 'Sora, Manrope' }}>NAUTILUS</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#006a62] bg-[#006a62]/10 px-2 py-0.5 rounded-full">LIVE</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full z-[70] flex flex-col w-72 bg-[#f1f4f6] border-r border-[#e0e3e5]/60 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#e5e9eb] transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[#42474e]">close</span>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full z-40 flex-col w-64 bg-[#f1f4f6] border-r border-[#e0e3e5]/60">
        {navContent}
      </aside>
    </>
  );
}
