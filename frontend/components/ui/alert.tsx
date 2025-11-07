import { forwardRef } from 'react';
import MuiAlert, { AlertProps as MuiAlertProps } from '@mui/material/Alert';
import MuiAlertTitle from '@mui/material/AlertTitle';
import Typography, { TypographyProps } from '@mui/material/Typography';

type Variant = 'default' | 'destructive';

const severityMap: Record<Variant, MuiAlertProps['severity']> = {
  default: 'info',
  destructive: 'error',
};

export interface AlertProps extends Omit<MuiAlertProps, 'variant' | 'severity'> {
  variant?: Variant;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', sx, ...props }, ref) => (
    <MuiAlert
      ref={ref}
      severity={severityMap[variant]}
      variant={variant === 'default' ? 'outlined' : 'filled'}
      sx={[
        {
          borderRadius: 3,
          alignItems: 'flex-start',
          borderWidth: 1.5,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  ),
);
Alert.displayName = 'Alert';

export const AlertTitle = forwardRef<HTMLDivElement, TypographyProps<'h5'>>(
  ({ children, ...props }, ref) => (
    <MuiAlertTitle
      ref={ref}
      sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}
      {...props}
    >
      {children}
    </MuiAlertTitle>
  ),
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = forwardRef<HTMLParagraphElement, TypographyProps<'p'>>(
  ({ children, ...props }, ref) => (
    <Typography
      ref={ref}
      component="div"
      variant="body2"
      sx={{ mt: 0.5 }}
      {...props}
    >
      {children}
    </Typography>
  ),
);
AlertDescription.displayName = 'AlertDescription';

export default Alert;
