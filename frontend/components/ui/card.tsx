import { forwardRef } from 'react';
import Paper, { PaperProps } from '@mui/material/Paper';
import Box, { BoxProps } from '@mui/material/Box';
import Typography, { TypographyProps } from '@mui/material/Typography';

export const Card = forwardRef<HTMLDivElement, PaperProps>(({ sx, ...props }, ref) => (
  <Paper
    ref={ref}
    elevation={1}
    sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      overflow: 'hidden',
      ...sx,
    }}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, BoxProps>(({ sx, ...props }, ref) => (
  <Box
    ref={ref}
    sx={{
      px: { xs: 3, md: 4 },
      pt: { xs: 3, md: 4 },
      pb: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.75,
      ...sx,
    }}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, TypographyProps<'h2'>>(
  ({ sx, variant = 'h6', ...props }, ref) => (
    <Typography
      ref={ref}
      variant={variant}
      component="h2"
      sx={{
        fontWeight: 600,
        lineHeight: 1.3,
        ...sx,
      }}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, TypographyProps<'p'>>(
  ({ sx, variant = 'body2', ...props }, ref) => (
    <Typography
      ref={ref}
      variant={variant}
      component="p"
      color="text.secondary"
      sx={{ ...sx }}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, BoxProps>(({ sx, ...props }, ref) => (
  <Box
    ref={ref}
    sx={{
      px: { xs: 3, md: 4 },
      pb: { xs: 3, md: 4 },
      pt: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      ...sx,
    }}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, BoxProps>(({ sx, ...props }, ref) => (
  <Box
    ref={ref}
    sx={{
      px: { xs: 3, md: 4 },
      pb: { xs: 3, md: 4 },
      pt: 0,
      display: 'flex',
      gap: 1,
      alignItems: 'center',
      ...sx,
    }}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export default Card;
