'use client';

import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function GuidedTour() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const seen = localStorage.getItem('nautilus_tour_seen');
    if (!seen) {
      startTour();
    }
  }, [mounted]);

  function startTour() {
    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: '#0B0E13ee',
      stagePadding: 8,
      stageRadius: 0,
      popoverClass: 'nautilus-tour',
      steps: [
        {
          popover: {
            title: 'Welcome to NAUTILUS',
            description:
              'Global commodity intelligence terminal. Real data from UN Comtrade, IMF PortWatch, and VesselFinder.',
          },
        },
        {
          element: '#nav-terminal',
          popover: {
            title: 'Terminal',
            description:
              'Query intelligence profiles for any vessel, company, commodity, country, or port.',
          },
        },
        {
          element: '#nav-feed',
          popover: {
            title: 'Vessels',
            description:
              'Live vessel activity feed. Real bulk carriers with IMO numbers, destinations, and confidence scores.',
          },
        },
        {
          element: '#nav-global',
          popover: {
            title: 'Global Command Center',
            description:
              'Deep-dive into any commodity. See exporters, importers, active regions, and trend data.',
          },
        },
        {
          element: '#nav-signals',
          popover: {
            title: 'Signals',
            description:
              'Automated alerts for new entities, dominance shifts, route expansions, and confirmed routes.',
          },
        },
        {
          popover: {
            title: 'You\u2019re all set',
            description:
              'Real data, global coverage. Click any row to drill in.',
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem('nautilus_tour_seen', '1');
        d.destroy();
      },
    });

    d.drive();
  }

  if (!mounted) return null;

  return (
    <button
      onClick={startTour}
      aria-label="Start guided tour"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-9 h-9 bg-[#121722] hover:bg-[#1a2030] text-[#6b7a8d] hover:text-[#C6A86B] text-sm font-semibold border border-[#1e2535] transition-colors duration-200 flex items-center justify-center"
      style={{ fontFamily: 'Manrope' }}
    >
      ?
    </button>
  );
}
