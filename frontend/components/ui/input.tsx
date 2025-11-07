import { forwardRef } from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';

export type InputProps = Omit<TextFieldProps, 'variant'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ fullWidth = true, margin = 'dense', ...props }, ref) => (
    <TextField
      {...props}
      inputRef={ref}
      fullWidth={fullWidth}
      margin={margin}
      variant="outlined"
    />
  ),
);

Input.displayName = 'Input';

export default Input;
