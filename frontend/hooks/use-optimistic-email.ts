import { useCallback } from 'react';
import { useEmailStore, type Email } from '@/stores/email-store';

/**
 * Optimistic email updates hook
 *
 * Provides optimistic UI updates with rollback on error.
 *
 * @example
 * ```tsx
 * const { optimisticUpdate } = useOptimisticEmail();
 *
 * await optimisticUpdate(
 *   emailId,
 *   { isRead: true },
 *   () => emailApi.updateEmail(emailId, { isRead: true })
 * );
 * ```
 */
export function useOptimisticEmail() {
  const { updateEmail } = useEmailStore();

  /**
   * Perform optimistic update with rollback on error
   */
  const optimisticUpdate = useCallback(
    async (
      emailId: string,
      updates: Partial<Email>,
      apiCall: () => Promise<any>
    ) => {
      // Store original state for rollback
      const originalState = { ...updates };

      try {
        // Optimistic update
        updateEmail(emailId, updates);

        // Execute API call
        await apiCall();
      } catch (error) {
        // Rollback on error
        updateEmail(emailId, originalState);
        throw error;
      }
    },
    [updateEmail]
  );

  return { optimisticUpdate };
}
