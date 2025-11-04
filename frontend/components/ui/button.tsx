import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = {
  default:
    'bg-sky-600 text-white shadow-lg shadow-sky-900/30 hover:bg-sky-500 focus-visible:ring-sky-400',
  destructive:
    'bg-rose-600 text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 focus-visible:ring-rose-400',
  outline:
    'border border-white/20 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white focus-visible:ring-slate-300',
  secondary:
    'bg-white/10 text-slate-100 hover:bg-white/15 shadow-inner shadow-slate-950/50 focus-visible:ring-slate-300',
  ghost:
    'bg-transparent text-slate-200 hover:bg-white/10 hover:text-white focus-visible:ring-slate-300',
  link: 'text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline',
};

const sizeVariants = {
  default: 'h-10 px-5 text-sm',
  sm: 'h-9 rounded-lg px-3 text-xs',
  lg: 'h-11 rounded-xl px-6 text-base',
  icon: 'h-10 w-10',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof sizeVariants;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        sizeVariants[size],
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

export { Button };
