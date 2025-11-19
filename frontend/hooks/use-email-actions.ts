import { useCallback } from 'react';
import { useEmailStore, type Email } from '@/stores/email-store';
import { emailApi } from '@/lib/api/email';
import { useRouter } from 'next/router';

/**
 * Email actions hook
 *
 * Provides centralized email actions with optimistic updates and error handling.
 *
 * @example
 * ```tsx
 * const { handleDelete, handleMarkAsRead, handleToggleStar } = useEmailActions();
 *
 * <Button onClick={() => handleDelete(email.id)}>Delete</Button>
 * ```
 */
export function useEmailActions() {
  const router = useRouter();
  const {
    updateEmail,
    deleteEmail,
    markAsRead,
    markAsStarred,
    bulkDelete,
    moveToFolder,
    setSelectedEmail,
  } = useEmailStore();

  /**
   * Delete a single email
   */
  const handleDelete = useCallback(
    async (emailId: string) => {
      try {
        // Optimistic update
        deleteEmail(emailId);

        // API call
        await emailApi.deleteEmail(emailId);
      } catch (error) {
        console.error('Failed to delete email:', error);
        // TODO: Revert optimistic update or show error toast
      }
    },
    [deleteEmail]
  );

  /**
   * Delete multiple emails
   */
  const handleBulkDelete = useCallback(
    async (emailIds: string[]) => {
      try {
        // Optimistic update
        bulkDelete(emailIds);

        // API calls (in parallel)
        await Promise.all(emailIds.map((id) => emailApi.deleteEmail(id)));
      } catch (error) {
        console.error('Failed to bulk delete emails:', error);
        // TODO: Revert optimistic update or show error toast
      }
    },
    [bulkDelete]
  );

  /**
   * Mark email(s) as read/unread
   */
  const handleMarkAsRead = useCallback(
    async (emailIds: string[], isRead: boolean = true) => {
      try {
        // Optimistic update
        markAsRead(emailIds);

        // API calls
        await Promise.all(
          emailIds.map((id) => emailApi.updateEmail(id, { isRead }))
        );
      } catch (error) {
        console.error('Failed to mark emails as read:', error);
        // TODO: Revert optimistic update or show error toast
      }
    },
    [markAsRead]
  );

  /**
   * Toggle star on email
   */
  const handleToggleStar = useCallback(
    async (emailId: string, currentStarred: boolean) => {
      const newStarred = !currentStarred;

      try {
        // Optimistic update
        markAsStarred([emailId], newStarred);

        // API call
        await emailApi.updateEmail(emailId, { isStarred: newStarred });
      } catch (error) {
        console.error('Failed to toggle star:', error);
        // Revert on error
        markAsStarred([emailId], currentStarred);
      }
    },
    [markAsStarred]
  );

  /**
   * Archive email (move to Archive folder)
   */
  const handleArchive = useCallback(
    async (emailIds: string[]) => {
      try {
        // Optimistic update
        moveToFolder(emailIds, 'ARCHIVE');

        // API calls
        await Promise.all(
          emailIds.map((id) => emailApi.updateEmail(id, { folder: 'ARCHIVE' }))
        );
      } catch (error) {
        console.error('Failed to archive emails:', error);
        // TODO: Revert optimistic update or show error toast
      }
    },
    [moveToFolder]
  );

  /**
   * Move email(s) to folder
   */
  const handleMoveToFolder = useCallback(
    async (emailIds: string[], folderId: string) => {
      try {
        // Optimistic update
        moveToFolder(emailIds, folderId);

        // API calls
        await Promise.all(
          emailIds.map((id) => emailApi.updateEmail(id, { folder: folderId }))
        );
      } catch (error) {
        console.error('Failed to move emails to folder:', error);
        // TODO: Revert optimistic update or show error toast
      }
    },
    [moveToFolder]
  );

  /**
   * Reply to email
   */
  const handleReply = useCallback(
    (email: Email) => {
      router.push({
        pathname: '/dashboard/email/compose',
        query: {
          replyTo: email.id,
          to: email.from,
          subject: `Re: ${email.subject}`,
        },
      });
    },
    [router]
  );

  /**
   * Forward email
   */
  const handleForward = useCallback(
    (email: Email) => {
      router.push({
        pathname: '/dashboard/email/compose',
        query: {
          forward: email.id,
          subject: `Fwd: ${email.subject}`,
          body: email.body,
        },
      });
    },
    [router]
  );

  /**
   * Open email in detail view
   */
  const handleEmailClick = useCallback(
    async (email: Email) => {
      // Set as selected
      setSelectedEmail(email);

      // Mark as read if unread
      if (!email.isRead) {
        try {
          updateEmail(email.id, { isRead: true });
          await emailApi.updateEmail(email.id, { isRead: true });
        } catch (error) {
          console.error('Failed to mark email as read:', error);
        }
      }
    },
    [setSelectedEmail, updateEmail]
  );

  return {
    handleDelete,
    handleBulkDelete,
    handleMarkAsRead,
    handleToggleStar,
    handleArchive,
    handleMoveToFolder,
    handleReply,
    handleForward,
    handleEmailClick,
  };
}
