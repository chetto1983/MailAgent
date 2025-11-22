import React from 'react';
import { Box, Chip } from '@mui/material';
import { Tag } from 'lucide-react';
import type { LabelColor } from '@/lib/api/labels';

/**
 * Label data structure
 */
export interface Label {
  id: string;
  name: string;
  color?: LabelColor | null;
}

/**
 * Props for ThreadLabels component
 */
export interface ThreadLabelsProps {
  /**
   * Array of labels to display
   */
  labels: Label[];

  /**
   * Maximum number of labels to show before collapsing
   * @default 3
   */
  maxVisible?: number;

  /**
   * Size of the label chips
   * @default 'small'
   */
  size?: 'small' | 'medium';

  /**
   * Whether to show the tag icon
   * @default true
   */
  showIcon?: boolean;
}

/**
 * ThreadLabels - Display labels/tags for threads
 *
 * Features:
 * - Shows up to N labels with overflow indicator
 * - Customizable colors
 * - Optional tag icon
 * - Compact design
 *
 * @example
 * ```tsx
 * <ThreadLabels
 *   labels={[
 *     { id: '1', name: 'Work', color: '#2196F3' },
 *     { id: '2', name: 'Important', color: '#F44336' }
 *   ]}
 *   maxVisible={3}
 * />
 * ```
 */
export const ThreadLabels: React.FC<ThreadLabelsProps> = ({
  labels,
  maxVisible = 3,
  size = 'small',
  showIcon = true,
}) => {
  if (!labels || labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, maxVisible);
  const remainingCount = labels.length - maxVisible;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {visibleLabels.map((label) => (
        <Chip
          key={label.id}
          size={size}
          icon={showIcon ? <Tag size={10} /> : undefined}
          label={label.name}
          sx={{
            height: size === 'small' ? 18 : 24,
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            bgcolor: label.color?.backgroundColor || 'primary.main',
            color: label.color?.textColor || '#fff',
            fontWeight: 500,
            '& .MuiChip-icon': {
              color: label.color?.textColor || '#fff',
              marginLeft: size === 'small' ? 0.5 : 1,
            },
            '& .MuiChip-label': {
              px: size === 'small' ? 1 : 1.5,
            },
          }}
        />
      ))}

      {remainingCount > 0 && (
        <Chip
          size={size}
          label={`+${remainingCount}`}
          sx={{
            height: size === 'small' ? 18 : 24,
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            bgcolor: 'action.hover',
            fontWeight: 500,
            '& .MuiChip-label': {
              px: size === 'small' ? 1 : 1.5,
            },
          }}
        />
      )}
    </Box>
  );
};
