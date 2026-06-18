'use client';

// frontend/app/analytics/page.tsx
//
// Rebuilt to match Chemistry@OCTET's actual branding instead of an invented
// dark theme: the real ChemistryOctetLogo component, the light cream/white
// card aesthetic, and the purple accent visible throughout the Content
// Manager screenshot. Playfair Display carries headings (matching the weight
// of "Content Manager"), DM Sans carries body text — the same face the logo
// itself uses for its orbiting band text, so the two stay visually tied
// together.
//
// ADJUST THIS IMPORT PATH to wherever ChemistryOctetLogo actually lives in
// your project — "@/components/ChemistryOctetLogo" is a best guess based on
// the standard Next.js path alias. If your tsconfig doesn't have that alias,
// swap it for a relative path instead.
import ChemistryOctetLogo from '../../components/ui/ChemistryOctetLogo';

// Assumes this page renders inside your existing admin layout (the one with
// the MENU / Content / My Profile sidebar) — so no sidebar is duplicated
// here, just the main content area. If /analytics needs its own nav entry
// in that sidebar, share the layout file and I'll wire it in.
//
// Phase 1 deliverable: access gating + dashboard shell. The three panels
// below are structural placeholders — Phase 2 wires in Bug & Error Tracking,
// Phase 3 wires in Infrastructure & Performance, Phase 4 wires in User &
// Engagement.

import type { ReactNode } from 'react';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { useAnalyticsAccess } from '../../hooks/admin/useAnalyticsAccess';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

// Matches the page background so the logo's inner circle blends in rather
// than showing its own default cream backdrop as a visible square behind it.
const PAGE_BG = '#f0efea';

const displayFont = { fontFamily: playfair.style.fontFamily };

type PanelIconKind = 'bug' | 'pulse' | 'users';

interface Panel {
  phase: string;
  title: string;
  description: string;
  icon: PanelIconKind;
}

const PANELS: Panel[] = [
  {
    phase: 'Phase 2',
    title: 'Bug & Error Tracking',
    description:
      'Supabase bug reports and live Sentry issues in one filterable log, with inline status updates for fast triage.',
    icon: 'bug',
  },
  {
    phase: 'Phase 3',
    title: 'Infrastructure & Performance',
    description:
      'Vercel build status and Core Web Vitals, Fly.io CPU/memory/latency, and historical synthetic ping checks on critical endpoints.',
    icon: 'pulse',
  },
  {
    phase: 'Phase 4',
    title: 'User & Engagement Analytics',
    description:
      'Total admins, total students, and active-user counts, plus an embedded heatmap of click and scroll behavior.',
    icon: 'users',
  },
];

export default function AnalyticsPage() {
  const { status, user } = useAnalyticsAccess();

  return (
    <div className={`min-h-screen bg-[#f0efea] px-6 sm:px-10 lg:px-14 py-10 ${dmSans.className}`}>
      {status === 'checking' && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
          <ChemistryOctetLogo size={64} background={PAGE_BG} />
          <p className="text-[#5b5566] text-sm">Verifying access…</p>
        </div>
      )}

      {status === 'denied' && (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
          <ChemistryOctetLogo size={88} background={PAGE_BG} />
          <h1 className="text-2xl font-semibold mt-2 text-[#221c2e]" style={displayFont}>
            This instrument isn&apos;t readable from here.
          </h1>
          <p className="text-[#5b5566] text-sm leading-relaxed">
            The analytics dashboard is restricted to admin and developer accounts. If that
            should include you, ask whoever manages Chemistry@OCTET roles to update your account.
          </p>
        </div>
      )}

      {status === 'authorized' && (
        <>
          <header className="flex items-start justify-between flex-wrap gap-6 pb-8 border-b border-[#e2dccf] mb-8">
            <div className="flex items-center gap-4">
              <ChemistryOctetLogo size={56} background={PAGE_BG} />
              <div>
                <h1 className="text-3xl font-bold text-[#221c2e]" style={displayFont}>
                  Developer Analytics
                </h1>
                <p className="text-[#5b5566] text-sm mt-1">
                  Real-time system health, bug tracking, and usage analytics — visible to
                  admins and developers only.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 bg-white border border-[#e2dccf] rounded-full px-3 py-1.5">
                <span className="live-pulse-dot w-[7px] h-[7px] rounded-full bg-[#3fa66b]" />
                <span className="text-[#3fa66b] text-xs font-medium tracking-wide">LIVE</span>
              </span>
              {user?.email && (
                <span className="bg-white border border-[#e2dccf] rounded-full px-3.5 py-1.5 text-xs text-[#5b5566]">
                  {user.email} · <span className="text-[#6e4e9e] font-medium">{user.role}</span>
                </span>
              )}
            </div>
          </header>

          <main className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {PANELS.map((panel) => (
              <section
                key={panel.title}
                className="bg-white border border-[#e7e2d8] rounded-2xl p-6 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <PanelIcon kind={panel.icon} />
                  <span className="text-[11px] font-medium tracking-wide uppercase text-[#6e4e9e] bg-[#f1eafb] rounded-full px-3 py-1">
                    {panel.phase}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[#221c2e]" style={displayFont}>
                  {panel.title}
                </h2>
                <p className="text-[#5b5566] text-sm leading-relaxed flex-grow">
                  {panel.description}
                </p>
                <div className="text-[11px] uppercase tracking-wide text-[#9b95a6] border-t border-dashed border-[#e7e2d8] pt-3 mt-1">
                  Wiring up next
                </div>
              </section>
            ))}
          </main>
        </>
      )}

      <GlobalAnimations />
    </div>
  );
}

function PanelIcon({ kind }: { kind: PanelIconKind }) {
  const paths: Record<PanelIconKind, ReactNode> = {
    bug: (
      <path d="M9 7h6M9 17h6M5 10h2M17 10h2M5 14h2M17 14h2M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3M7 10v7a5 5 0 0010 0v-7a3 3 0 00-3-3h-4a3 3 0 00-3 3z" />
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    users: <path d="M16 14a4 4 0 10-8 0M9 9a3 3 0 116 0 3 3 0 11-6 0M3 20a6 6 0 0118 0" />,
  };
  return (
    <svg
      className="w-5 h-5 text-[#6e4e9e]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  );
}

function GlobalAnimations() {
  return (
    <style jsx global>{`
      .live-pulse-dot {
        animation: analytics-live-pulse 2s infinite;
      }
      @keyframes analytics-live-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(63, 166, 107, 0.5);
        }
        70% {
          box-shadow: 0 0 0 6px rgba(63, 166, 107, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(63, 166, 107, 0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .live-pulse-dot {
          animation: none;
        }
      }
    `}</style>
  );
}