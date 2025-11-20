import { useEffect, useRef, useState, useCallback } from 'react';
import { emailApi } from '@/lib/api/email';

export interface DraftData {
  providerId: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface UseDraftAutosaveOptions {
  /**
   * Draft data to autosave
   */
  draftData: DraftData;

  /**
   * Whether autosave is enabled
   */
  enabled: boolean;

  /**
   * Autosave interval in milliseconds (default: 30000 = 30s)
   */
  interval?: number;

  /**
   * Callback when draft is saved successfully
   */
  onSaved?: (draftId: string) => void;

  /**
   * Callback when draft save fails
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for autosaving email drafts
 *
 * Features:
 * - Automatic periodic saving
 * - Debouncing to avoid too frequent saves
 * - Skip saving if draft is empty
 * - Track saving state and last saved time
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved, saveDraft } = useDraftAutosave({
 *   draftData: {
 *     providerId,
 *     to: ['user@example.com'],
 *     subject: 'Hello',
 *     bodyText: 'Message',
 *   },
 *   enabled: true,
 *   onSaved: (id) => console.log('Draft saved:', id),
 * });
 * ```
 */
export function useDraftAutosave({
  draftData,
  enabled,
  interval = 30000, // 30 seconds
  onSaved,
  onError,
}: UseDraftAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');

  // Check if draft is empty
  const isDraftEmpty = useCallback((data: DraftData): boolean => {
    return !data.to?.length && !data.subject && !data.bodyText;
  }, []);

  // Save draft function
  const saveDraft = useCallback(async () => {
    if (!enabled || isDraftEmpty(draftData)) {
      return;
    }

    // Check if data changed since last save
    const currentData = JSON.stringify(draftData);
    if (currentData === lastDataRef.current) {
      return; // No changes, skip save
    }

    try {
      setIsSaving(true);

      const result = await emailApi.saveDraft({
        id: draftId || undefined,
        ...draftData,
      });

      // Update refs
      lastDataRef.current = currentData;
      setDraftId(result.data.id);
      setLastSaved(new Date());

      onSaved?.(result.data.id);
    } catch (error) {
      console.error('Failed to autosave draft:', error);
      onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, draftData, draftId, isDraftEmpty, onSaved, onError]);

  // Setup autosave interval
  useEffect(() => {
    if (!enabled) {
      // Clear timeout if autosave disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, interval);

    // Cleanup on unmount or when deps change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [draftData, enabled, interval, saveDraft]);

  return {
    isSaving,
    lastSaved,
    draftId,
    saveDraft,
  };
}
