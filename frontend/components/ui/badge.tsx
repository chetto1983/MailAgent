import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border border-white/10 bg-white/10 text-slate-100',
    secondary: 'border border-sky-400/40 bg-sky-500/15 text-sky-100',
    destructive: 'border border-rose-500/40 bg-rose-500/15 text-rose-100',
    outline: 'border border-white/20 text-slate-200',
    success: 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${variants[variant]} ${className || ''}`}
      {...props}
    />
  );
}

export { Badge };
