import React from 'react';

/**
 * Fixed route-based navigation for Yehulu Digital.
 * Each icon opens one page; Admin Login is available to client content managers.
 * The estimator remains available by direct URL at /estimate.
 */
const navItems = [
  {
    id: 'home', label: 'Home', href: '/',
    icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>
  },
  {
    id: 'about', label: 'About', href: '/about',
    icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
  },
  {
    id: 'services', label: 'Services', href: '/services',
    icon: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>
  },
  {
    id: 'work', label: 'Projects', href: '/gallery',
    icon: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" /></>
  },
  {
    id: 'video', label: 'Videos', href: '/video',
    icon: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>
  },
  {
    id: 'courses', label: 'Courses', href: '/courses',
    icon: <><path d="m2 8 10-5 10 5-10 5-10-5Z" /><path d="M6 10v6c3.5 3 8.5 3 12 0v-6M22 8v6" /></>
  },
  {
    id: 'admin', label: 'Admin', href: '/admin/login',
    icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>
  },
  {
    id: 'contact', label: 'Contact', href: '/contact',
    icon: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>
  }
];

function getActivePage(pathname) {
  if (pathname === '/' || pathname === '/index.html') return 'home';
  if (pathname === '/services') return 'services';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname === '/about') return 'about';
  if (pathname === '/gallery') return 'work';
  if (pathname === '/video') return 'video';
  if (pathname.startsWith('/courses')) return 'courses';
  if (pathname === '/contact') return 'contact';
  return '';
}

export default function BottomDock() {
  const active = getActivePage(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  return (
    <nav
      id="floating-dock"
      aria-label="Main navigation"
      className="fixed left-1/2 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[9990] grid w-[min(680px,calc(100vw-16px))] grid-cols-8 items-center gap-0.5 rounded-full border border-[#B6FF00]/25 bg-black/85 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.7)] backdrop-blur-2xl -translate-x-1/2"
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            title={item.label}
            className={`group relative inline-flex h-10 min-w-0 items-center justify-center rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#B6FF00] ${
              isActive
                ? 'scale-105 bg-[#B6FF00] text-black shadow-[0_0_16px_rgba(182,255,0,0.35)]'
                : 'text-zinc-400 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px] sm:h-5 sm:w-5"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#B6FF00]/30 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
