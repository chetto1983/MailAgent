import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, LogOut, Mail, Sparkles, Settings, ServerCog } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard/index', label: 'AI Copilot', icon: Sparkles },
  { href: '/dashboard/email', label: 'Inbox', icon: Mail },
  { href: '/dashboard/providers', label: 'Providers', icon: ServerCog },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface DashboardLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onLogout?: () => void;
}

export function DashboardLayout({
  title,
  description,
  actions,
  children,
  onLogout,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentPath = useMemo(() => {
    // Normalise Next.js dynamic routes and trailing slashes
    const normalized = router.pathname.replace(/\/$/, '');
    return normalized === '' ? '/' : normalized;
  }, [router.pathname]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Decorative glows */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 flex justify-center">
        <div className="h-64 w-[40rem] bg-sky-500/20 blur-[120px]" />
      </div>
      <div className="pointer-events-none fixed inset-y-0 left-0 z-0 w-40 bg-emerald-500/10 blur-[140px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-20 border-b border-white/5 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/index" className="group flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 shadow-inner shadow-sky-500/40 transition group-hover:scale-105">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                    MailAgent
                  </p>
                  <p className="text-sm text-slate-300">PMSync workspace</p>
                </div>
              </Link>
            </div>

            <nav className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2 py-1 shadow-lg shadow-slate-950/40 backdrop-blur lg:flex">
              {navItems.map((item) => {
                const isActive = currentPath.startsWith(item.href.replace(/\/index$/, ''));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-200 shadow-inner shadow-sky-500/20'
                        : 'text-slate-300 hover:text-slate-50 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {actions}
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 rounded-full border border-white/10 text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200 lg:flex"
                onClick={onLogout}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 lg:hidden"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile nav sheet */}
          <div
            className={`lg:hidden transition-transform duration-300 ${
              mobileNavOpen ? 'translate-y-0' : '-translate-y-full'
            }`}
          >
            <div className="space-y-2 border-t border-white/5 bg-slate-950/95 px-4 pb-4 pt-3 shadow-lg shadow-slate-950/30 backdrop-blur">
              {navItems.map((item) => {
                const isActive = currentPath.startsWith(item.href.replace(/\/index$/, ''));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                      isActive
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-slate-50'
                    }`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start rounded-2xl border border-white/10 text-slate-300 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-6 lg:py-10">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-slate-950/40 backdrop-blur">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">{title}</h1>
                  {description && (
                    <p className="text-sm text-slate-300 md:text-base">{description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:hidden">{actions}</div>
              </div>
            </div>

            <div className="flex flex-col gap-6 pb-12">{children}</div>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-4 mx-auto flex w-[min(420px,90%)] items-center justify-between rounded-full border border-white/10 bg-slate-950/90 px-3 py-2 shadow-2xl shadow-slate-950/70 backdrop-blur lg:hidden">
          {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.href.replace(/\/index$/, ''));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-1 text-xs transition ${
                  isActive
                    ? 'text-sky-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-sky-300' : ''}`} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sky-200 transition hover:scale-105"
            onClick={onLogout}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}

export default DashboardLayout;
