import { useEffect } from 'react';
import { useEmailStore, type Email } from '@/stores/email-store';

/**
 * Keyboard navigation hook for email list
 *
 * Supports:
 * - j/k: Navigate up/down
 * - Enter: Open email
 * - d: Delete
 * - s: Star
 * - r: Reply
 *
 * @example
 * ```tsx
 * const { handleDelete, handleReply } = useEmailActions();
 * useKeyboardNavigation({
 *   emails,
 *   onDelete: handleDelete,
 *   onReply: handleReply,
 * });
 * ```
 */
export function useKeyboardNavigation(options: {
  emails: Email[];
  enabled?: boolean;
  onDelete?: (id: string) => void;
  onReply?: (email: Email) => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
}) {
  const { emails, enabled = true, onDelete, onReply, onToggleStar } = options;
  const { selectedEmail, setSelectedEmail } = useEmailStore();

  useEffect(() => {
    if (!enabled || emails.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const currentIndex = selectedEmail
        ? emails.findIndex((email) => email.id === selectedEmail.id)
        : -1;

      switch (e.key.toLowerCase()) {
        case 'j': // Next email
          e.preventDefault();
          if (currentIndex < emails.length - 1) {
            setSelectedEmail(emails[currentIndex + 1]);
          }
          break;

        case 'k': // Previous email
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedEmail(emails[currentIndex - 1]);
          } else if (currentIndex === -1 && emails.length > 0) {
            setSelectedEmail(emails[0]);
          }
          break;

        case 'enter': // Open email
          if (selectedEmail && currentIndex !== -1) {
            setSelectedEmail(selectedEmail);
          }
          break;

        case 'd': // Delete
          if (selectedEmail && onDelete) {
            e.preventDefault();
            onDelete(selectedEmail.id);
          }
          break;

        case 's': // Toggle star
          if (selectedEmail && onToggleStar) {
            e.preventDefault();
            onToggleStar(selectedEmail.id, selectedEmail.isStarred || false);
          }
          break;

        case 'r': // Reply
          if (selectedEmail && onReply) {
            e.preventDefault();
            onReply(selectedEmail);
          }
          break;

        case 'escape': // Close detail view
          e.preventDefault();
          setSelectedEmail(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enabled, emails, selectedEmail, setSelectedEmail, onDelete, onReply, onToggleStar]);
}
