# Email Sync – Deletion & Folder Sync Plan

_Aggiornamento previsto: 4 novembre 2025_

## Obiettivi
- Propagare correttamente cancellazioni/spostamenti dalle caselle Gmail e IMAP al database locale.
- Allineare i metadati di cartella/etichetta dopo spostamenti lato provider.
- Mantenere i job di embedding coerenti con lo stato (evitare vettori per email eliminate).

## Stato Attuale
- **Microsoft Graph**: delta feed marca `isDeleted = true` (`microsoft-sync.service.ts` ✓).
- **Gmail**: `messagesDeleted` intercettato ma non elaborato (TODO).
- **IMAP generico**: nessuna gestione delete/move; aggiorniamo solo flag lettura/stella.
- **Embeddings**: non c’è routine di cleanup per email eliminate.

## Piano di lavoro
1. **Schema & Indici**
   - Verificare indice su `emails.isDeleted` (già presente).
   - Valutare tabella `email_events` per audit opzionale.

2. **Gmail**
   - Implementare gestione `messagesDeleted` in `syncIncremental`.
   - Aggiornare campi: `isDeleted = true`, `folder = 'TRASH'`.
   - Eventuale hard-delete se messaggio già in `TRASH` e query ritorna rimozione definitiva.

3. **IMAP**
   - Abilitare IDLE/FLAGS per intercettare `\Deleted`.
   - On incremental: se UID manca dal fetch, marcare `isDeleted = true`.
   - Mappare `folder` via `X-GM-LABELS` o SEARCH per provider compatibili; fallback a `metadata`.

4. **Folder Moves**
   - Gmail: leggere `labelIds` aggiornate e sincronizzare `folder` + `labels`.
   - IMAP: usare `ENVELOPE` + `mailbox` quando disponibile; altrimenti query separata.

5. **Embeddings Cleanup**
   - Nuovo job scheduled che rimuove embedding (`KnowledgeBaseService.deleteEmbeddingsForEmail`) per email `isDeleted = true`.
   - Valutare soft-delete (`metadata.status = 'deleted'`) per audit.

6. **Test**
   - Caso Gmail: eliminazione, spostamento (Inbox → Label), recupero da cestino.
   - Caso IMAP: `\Deleted` + expunge, spostamento cartella.
   - Verificare sparizione embedding associato.

## Note
- Coordinare con limitazioni rate limit (applicare batch da 10 update).
- Aggiornare documentazione (`CURRENT_STATUS.md`, `EMAIL_SYNC_USAGE.md`) a lavoro finito.
