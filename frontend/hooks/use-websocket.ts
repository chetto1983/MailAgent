import { useEffect, useRef, useCallback } from 'react';
import { websocketClient } from '@/lib/websocket-client';
import { useEmailStore } from '@/stores/email-store';
import { useCalendarStore } from '@/stores/calendar-store';
import { useContactStore } from '@/stores/contact-store';

/**
 * Hook per gestire la connessione WebSocket e gli eventi realtime
 *
 * Caratteristiche:
 * - Connessione automatica con JWT
 * - Disconnessione automatica al unmount
 * - Event listeners per Email, Calendar, Contacts
 * - Aggiornamento automatico degli store globali
 *
 * @param token - JWT token per autenticazione
 * @param enabled - Abilita/disabilita la connessione (default: true)
 */
export function useWebSocket(token: string | null, enabled = true) {
  const isConnectedRef = useRef(false);

  // Store actions
  const { addEmail, updateEmail, deleteEmail, setUnreadCount } = useEmailStore();
  const { addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const { addContact, updateContact, deleteContact } = useContactStore();

  /**
   * Connetti al WebSocket
   */
  const connect = useCallback(async () => {
    if (!token || !enabled || isConnectedRef.current) return;

    try {
      console.log('[useWebSocket] Connecting...');
      await websocketClient.connect(token);
      isConnectedRef.current = true;
      console.log('[useWebSocket] Connected successfully');
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);
      isConnectedRef.current = false;
    }
  }, [token, enabled]);

  /**
   * Disconnetti dal WebSocket
   */
  const disconnect = useCallback(() => {
    if (isConnectedRef.current) {
      websocketClient.disconnect();
      isConnectedRef.current = false;
      console.log('[useWebSocket] Disconnected');
    }
  }, []);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    if (!token || !enabled) return;

    // Connect
    connect();

    // EMAIL EVENTS
    const unsubEmailNew = websocketClient.onEmailNew((data) => {
      console.log('[WS] Email new:', data);
      if (data.email) {
        addEmail(data.email);
      }
    });

    const unsubEmailUpdate = websocketClient.onEmailUpdate((data) => {
      console.log('[WS] Email update:', data);
      if (data.emailId && data.updates) {
        updateEmail(data.emailId, data.updates);
      }
    });

    const unsubEmailDelete = websocketClient.onEmailDelete((data) => {
      console.log('[WS] Email delete:', data);
      if (data.emailId) {
        deleteEmail(data.emailId);
      }
    });

    const unsubUnreadCount = websocketClient.onUnreadCountUpdate((data) => {
      console.log('[WS] Unread count update:', data);
      setUnreadCount(data.count);
    });

    // CALENDAR EVENTS
    const unsubCalendarNew = websocketClient.onCalendarEventNew((data) => {
      console.log('[WS] Calendar event new:', data);
      if (data.event) {
        addEvent(data.event);
      }
    });

    const unsubCalendarUpdate = websocketClient.onCalendarEventUpdate((data) => {
      console.log('[WS] Calendar event update:', data);
      if (data.eventId && data.updates) {
        updateEvent(data.eventId, data.updates);
      }
    });

    const unsubCalendarDelete = websocketClient.onCalendarEventDelete((data) => {
      console.log('[WS] Calendar event delete:', data);
      if (data.eventId) {
        deleteEvent(data.eventId);
      }
    });

    // CONTACT EVENTS
    const unsubContactNew = websocketClient.onContactNew((data) => {
      console.log('[WS] Contact new:', data);
      if (data.contact) {
        addContact(data.contact);
      }
    });

    const unsubContactUpdate = websocketClient.onContactUpdate((data) => {
      console.log('[WS] Contact update:', data);
      if (data.contactId && data.updates) {
        updateContact(data.contactId, data.updates);
      }
    });

    const unsubContactDelete = websocketClient.onContactDelete((data) => {
      console.log('[WS] Contact delete:', data);
      if (data.contactId) {
        deleteContact(data.contactId);
      }
    });

    // SYNC STATUS
    const unsubSyncStatus = websocketClient.onSyncStatus((data) => {
      console.log('[WS] Sync status:', data);
      // You can add a toast notification here or update a sync status store
    });

    // Cleanup on unmount
    return () => {
      console.log('[useWebSocket] Cleaning up...');
      unsubEmailNew();
      unsubEmailUpdate();
      unsubEmailDelete();
      unsubUnreadCount();
      unsubCalendarNew();
      unsubCalendarUpdate();
      unsubCalendarDelete();
      unsubContactNew();
      unsubContactUpdate();
      unsubContactDelete();
      unsubSyncStatus();
      disconnect();
    };
  }, [
    token,
    enabled,
    connect,
    disconnect,
    addEmail,
    updateEmail,
    deleteEmail,
    setUnreadCount,
    addEvent,
    updateEvent,
    deleteEvent,
    addContact,
    updateContact,
    deleteContact,
  ]);

  return {
    isConnected: websocketClient.isConnected(),
    connect,
    disconnect,
    ping: websocketClient.ping.bind(websocketClient),
    joinRoom: websocketClient.joinRoom.bind(websocketClient),
    leaveRoom: websocketClient.leaveRoom.bind(websocketClient),
  };
}
