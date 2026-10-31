import React, { useState, useEffect } from 'react';

/**
 * Floating Bottom Navigation Dock inspired by modern portfolio UI (e.g. yishak-tule.vercel.app)
 * Fixed to viewport bottom, icon-based with hover tooltips, active section highlighting.
 */
export default function BottomDock({ activeSection, onNavigate }) {
  const [active, setActive] = useState(activeSection || 'home');

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    },
    {
      id: 'services',
      label: 'Services',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )
    },
    {
      id: 'work',
      label: 'Projects',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      )
    },
    {
      id: 'estimate',
      label: 'Estimator',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    if (activeSection) setActive(activeSection);
  }, [activeSection]);

  const handleClick = (id, e) => {
    setActive(id);
    if (onNavigate) {
      onNavigate(id, e);
    } else {
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav
      id="floating-dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-black/80 dark:bg-black/85 backdrop-blur-2xl border border-[#B6FF00]/25 rounded-full shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_24px_rgba(182,255,0,0.15)] transition-all duration-300 max-w-[calc(100vw-32px)]"
      aria-label="Floating Navigation Dock"
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(item.id, e)}
            className={`group relative inline-flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 outline-none ${
              isActive
                ? 'bg-[#B6FF00] text-black shadow-[0_0_20px_rgba(182,255,0,0.5)] -translate-y-0.5 scale-105'
                : 'text-zinc-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5'
            }`}
            aria-label={item.label}
          >
            {item.icon}

            {/* Hover Tooltip */}
            <span className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-white bg-zinc-950 border border-white/20 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-200 pointer-events-none shadow-xl scale-95 group-hover:scale-100">
              {item.label}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
            </span>
          </a>
        );
      })}
    </nav>
  );
}

