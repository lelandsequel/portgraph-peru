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
      overlayColor: '#00263fcc',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'nautilus-tour',
      steps: [
        {
          popover: {
            title: 'Welcome to NAUTILUS',
            description:
              'NAUTILUS tracks real copper and zinc moving out of Peru in real time. Here\u2019s how to read it.',
          },
        },
        {
          element: '#nav-feed',
          popover: {
            title: 'Trade Flows',
            description:
              'Annual trade flows. Peru exported $15.6B in copper ore to China in 2024. Each row is a real HS-code flow.',
          },
        },
        {
          element: '#nav-map',
          popover: {
            title: 'Ports & Routes',
            description:
              'Daily vessel counts at Callao, Matarani, and Ilo \u2014 pulled from satellite AIS via IMF PortWatch. Updates every day.',
          },
        },
        {
          element: '#nav-dashboard',
          popover: {
            title: 'Vessels & Intelligence',
            description:
              'Live bulk carriers. These are real ships currently in port or expected. IMO numbers are real.',
          },
        },
        {
          element: '#nav-signals',
          popover: {
            title: 'Signals',
            description:
              'Automated alerts. When a new entity enters a route or dominance shifts, you get flagged here. Route-confirmed signals tell you which ship is heading where.',
          },
        },
        {
          popover: {
            title: 'You\u2019re all set',
            description:
              'That\u2019s it. Real data, zero cost. Click any row to drill in.',
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
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-[#e5e9eb] hover:bg-[#c2c7ce] text-[#42474e] text-sm font-semibold shadow-sm transition-colors duration-200 flex items-center justify-center"
      style={{ fontFamily: 'Manrope' }}
    >
      ?
    </button>
  );
}
