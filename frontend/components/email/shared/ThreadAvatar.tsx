import React from 'react';
import { Avatar } from '@mui/material';

/**
 * Props for ThreadAvatar component
 */
export interface ThreadAvatarProps {
  /**
   * Email address of the sender
   */
  email: string;

  /**
   * Name of the sender
   */
  name: string;

  /**
   * Optional provider icon to display instead of initials
   */
  providerIcon?: React.ReactNode;

  /**
   * Whether this thread has unread messages
   */
  isUnread?: boolean;

  /**
   * Custom size for the avatar
   */
  size?: number;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Parse name to get initials
 */
function getInitials(name: string): string {
  if (!name) return 'U';

  // Remove quotes and trim
  const cleanName = name.replace(/^['"]|['"]$/g, '').trim();

  // Split by space and get first letters
  const parts = cleanName.split(' ').filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  // Get first letter of first and last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * ThreadAvatar - Enhanced avatar component with BIMI support
 *
 * Features:
 * - Displays sender's initials or provider icon
 * - Visual indicator for unread status
 * - Supports custom sizing
 * - Future: BIMI (Brand Indicators for Message Identification) support
 *
 * @example
 * ```tsx
 * <ThreadAvatar
 *   email="john@example.com"
 *   name="John Doe"
 *   isUnread={true}
 *   size={40}
 * />
 * ```
 */
export const ThreadAvatar: React.FC<ThreadAvatarProps> = ({
  email,
  name,
  providerIcon,
  isUnread = false,
  size = 40,
  className,
}) => {
  const initials = getInitials(name || email);

  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: isUnread ? 700 : 500,
        bgcolor: isUnread ? 'primary.main' : 'grey.400',
        border: isUnread ? 2 : 0,
        borderColor: 'primary.main',
        transition: 'all 0.2s ease',
      }}
      className={className}
    >
      {providerIcon || initials}
    </Avatar>
  );
};
