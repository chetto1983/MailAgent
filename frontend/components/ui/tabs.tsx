import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import MuiTabs from '@mui/material/Tabs';
import MuiTab from '@mui/material/Tab';
import Box, { BoxProps } from '@mui/material/Box';
import type { TabsProps as MuiTabsProps } from '@mui/material/Tabs';
import type { TabProps as MuiTabProps } from '@mui/material/Tab';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>.');
  }
  return context;
};

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
  sx?: BoxProps['sx'];
}

export const Tabs = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
  sx,
}: TabsProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = typeof controlledValue !== 'undefined';
  const value = isControlled ? (controlledValue as string) : uncontrolledValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value,
      setValue: (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
    }),
    [isControlled, onValueChange, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <Box className={className} sx={sx}>
        {children}
      </Box>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends Omit<MuiTabsProps, 'value' | 'onChange'> {
  children: ReactNode;
}

export const TabsList = ({ children, sx, ...props }: TabsListProps) => {
  const { value, setValue } = useTabsContext();

  return (
    <MuiTabs
      {...props}
      value={value}
      onChange={(_event, newValue) => setValue(newValue)}
      variant="scrollable"
      scrollButtons="auto"
      TabIndicatorProps={{
        sx: { borderRadius: 9999, height: 3 },
      }}
      sx={[
        {
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 0.5,
          minHeight: 56,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </MuiTabs>
  );
};

export interface TabsTriggerProps extends Omit<MuiTabProps, 'value' | 'label'> {
  value: string;
  label: ReactNode;
}

export const TabsTrigger = ({ value, label, sx, ...props }: TabsTriggerProps) => (
  <MuiTab
    {...props}
    value={value}
    disableRipple
    label={label}
    sx={[
      {
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 2,
        minHeight: 48,
        minWidth: 120,
        '&.Mui-selected': {
          bgcolor: 'action.selected',
        },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  />
);

export interface TabsContentProps extends BoxProps {
  value: string;
  children: ReactNode;
}

export const TabsContent = ({ value, children, sx, ...props }: TabsContentProps) => {
  const context = useTabsContext();
  if (context.value !== value) {
    return null;
  }

  return (
    <Box
      {...props}
      sx={[
        { mt: 3, width: '100%' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
};
