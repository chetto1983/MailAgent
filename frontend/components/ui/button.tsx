import { forwardRef } from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'default' | 'lg' | 'icon';

const variantMap: Record<
  Variant,
  { muiVariant: MuiButtonProps['variant']; color: MuiButtonProps['color']; sx?: SxProps<Theme> }
> = {
  default: { muiVariant: 'contained', color: 'primary' },
  destructive: { muiVariant: 'contained', color: 'error' },
  outline: { muiVariant: 'outlined', color: 'primary' },
  secondary: { muiVariant: 'contained', color: 'secondary' },
  ghost: {
    muiVariant: 'text',
    color: 'primary',
    sx: { bgcolor: 'transparent', '&:hover': { bgcolor: 'action.hover' } },
  },
  link: {
    muiVariant: 'text',
    color: 'primary',
    sx: { textDecoration: 'underline', textUnderlineOffset: 4 },
  },
};

const sizeMap: Record<Size, { size: MuiButtonProps['size']; sx?: SxProps<Theme> }> = {
  sm: { size: 'small', sx: { borderRadius: 2 } },
  default: { size: 'medium', sx: { borderRadius: 3 } },
  lg: { size: 'large', sx: { borderRadius: 3.5, px: 3 } },
  icon: {
    size: 'medium',
    sx: {
      borderRadius: '50%',
      minWidth: 48,
      width: 48,
      height: 48,
      p: 0,
    },
  },
};

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color' | 'size'> {
  variant?: Variant;
  size?: Size;
}

const toSxArray = (value?: SxProps<Theme>): SxProps<Theme>[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', sx, ...props }, ref) => {
    const variantStyles = variantMap[variant];
    const sizeStyles = sizeMap[size];

    const baseStyles: SystemStyleObject<Theme> = {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: 3,
    };

    const combinedSx = [
      baseStyles,
      ...toSxArray(variantStyles.sx),
      ...toSxArray(sizeStyles.sx),
      ...toSxArray(sx),
    ] as SxProps<Theme>;

    return (
      <MuiButton
        {...props}
        ref={ref}
        variant={variantStyles.muiVariant}
        color={variantStyles.color}
        size={sizeStyles.size}
        sx={combinedSx}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;
