import * as React from 'react';
import { cn } from '@/lib/utils';

const alertVariants = {
  default: 'border-white/10 bg-white/5 text-slate-100 shadow-lg shadow-slate-950/30',
  destructive:
    'border-rose-500/60 bg-rose-500/10 text-rose-200 [&>svg]:text-rose-300 shadow-lg shadow-rose-900/30',
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof alertVariants;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-2xl border p-4 backdrop-blur',
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  ),
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  ),
);

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-slate-200 [&_p]:leading-relaxed', className)} {...props} />
  ),
);

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
