import { forwardRef } from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export const Button = forwardRef<HTMLButtonElement, MuiButtonProps>(
  ({ sx, ...props }, ref) => {
    const baseStyles: SystemStyleObject<Theme> = {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: 3,
    };

    const combinedSx = [
      baseStyles,
      ...(Array.isArray(sx) ? sx : [sx]),
    ] as SxProps<Theme>;

    return (
      <MuiButton
        {...props}
        ref={ref}
        sx={combinedSx}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;
