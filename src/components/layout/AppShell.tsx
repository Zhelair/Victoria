'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useVictoriaStore } from '@/store';
import { getMoodTier } from '@/types';

const NAV_ITEMS = [
  { href: '/', labelKey: 'nav.home', icon: HomeIcon },
  { href: '/chat', labelKey: 'nav.chat', icon: ChatIcon },
  { href: '/plans', labelKey: 'nav.plans', icon: PlansIcon },
  { href: '/track', labelKey: 'nav.track', icon: TrackIcon },
  { href: '/stats', labelKey: 'nav.stats', icon: StatsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const moodTier = getMoodTier(moodScore);

  // Don't show nav during onboarding
  if (pathname === '/onboarding') {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-theme sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-xs" style={{ color: 'var(--accent)' }}>
            VICTORIA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MoodBadge tier={moodTier} score={moodScore} />
          <Link
            href="/settings"
            className="p-1.5 rounded-lg hover:bg-shell transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                  isActive
                    ? 'bg-accent text-white scale-105'
                    : 'text-muted hover:text-text hover:bg-shell'
                )}
                style={isActive ? { backgroundColor: 'var(--accent)', color: 'white' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="font-pixel text-[7px] leading-none">{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MoodBadge({ tier, score }: { tier: string; score: number }) {
  const colors: Record<string, string> = {
    sunshine: '#22c55e',
    balanced: '#3b82f6',
    sideeye: '#f59e0b',
    icequeen: '#06b6d4',
    dark: '#6b7280',
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-theme bg-shell">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: colors[tier] ?? '#999' }}
      />
      <span className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
        {score}
      </span>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function PlansIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function TrackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function StatsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
