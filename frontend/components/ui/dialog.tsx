import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  cloneElement,
  isValidElement,
  type ReactElement,
  type MouseEvent,
} from 'react';
import MuiDialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import MuiDialogContent, { DialogContentProps as MuiDialogContentProps } from '@mui/material/DialogContent';
import MuiDialogTitle, { DialogTitleProps as MuiDialogTitleProps } from '@mui/material/DialogTitle';
import MuiDialogActions, { DialogActionsProps } from '@mui/material/DialogActions';
import Box, { BoxProps } from '@mui/material/Box';
import Typography, { TypographyProps } from '@mui/material/Typography';

interface DialogContextValue {
  setOpen?: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>({});

export interface DialogProps extends Omit<MuiDialogProps, 'onClose'> {
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  onClose?: MuiDialogProps['onClose'];
}

export const Dialog = ({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  PaperProps,
  onClose,
  ...props
}: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  const handleClose: MuiDialogProps['onClose'] = (event, reason) => {
    onClose?.(event, reason);
    setOpen(false);
  };

  const mergedPaperProps = useMemo(
    () => ({
      ...PaperProps,
      sx: [
        {
          borderRadius: 3,
        },
        ...(PaperProps?.sx ? (Array.isArray(PaperProps.sx) ? PaperProps.sx : [PaperProps.sx]) : []),
      ],
    }),
    [PaperProps],
  );

  return (
    <DialogContext.Provider value={{ setOpen }}>
      <MuiDialog
        {...props}
        open={open}
        onClose={handleClose}
        PaperProps={mergedPaperProps}
      >
        {children}
      </MuiDialog>
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps {
  children: ReactElement;
  asChild?: boolean;
}

export const DialogTrigger = ({ children }: DialogTriggerProps) => {
  const context = useContext(DialogContext);

  if (!isValidElement(children)) {
    throw new Error('DialogTrigger expects a single React element child.');
  }

  const child = children as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    child.props.onClick?.(event);
    context.setOpen?.(true);
  };

  return cloneElement(child, { onClick: handleClick });
};

export type DialogContentProps = MuiDialogContentProps;

export const DialogContent = ({ sx, ...props }: DialogContentProps) => (
  <MuiDialogContent
    sx={[
      {
        p: { xs: 3, sm: 4 },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...props}
  />
);

export const DialogHeader = ({ sx, ...props }: BoxProps) => (
  <Box
    sx={[
      {
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...props}
  />
);

export const DialogFooter = ({ sx, ...props }: DialogActionsProps) => (
  <MuiDialogActions
    sx={[
      {
        px: { xs: 3, sm: 4 },
        pb: { xs: 3, sm: 4 },
        pt: 0,
        gap: 1,
        flexWrap: 'wrap',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...props}
  />
);

export const DialogTitle = ({ sx, ...props }: MuiDialogTitleProps) => (
  <MuiDialogTitle
    sx={[
      { fontWeight: 600 },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...props}
  />
);

export const DialogDescription = ({ sx, ...props }: TypographyProps<'p'>) => (
  <Typography
    component="p"
    color="text.secondary"
    variant="body2"
    sx={[
      { mt: 0.5 },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    {...props}
  />
);

export default Dialog;
