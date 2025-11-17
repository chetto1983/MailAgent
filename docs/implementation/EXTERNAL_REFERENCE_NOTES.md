# External Reference Notes — Repo_Esempio/Zero-main (backend mail/contacts/calendar)

Confronto con Repo_Esempio\Zero-main\Zero-main (apps/server/src/lib/driver) per spunti di integrazione.

## Gmail (Zero-main `google.ts`)
- **Scope ampia:** usa scope full `mail.modify` + userinfo; gestione OAuth via `OAuth2Client`.
- **Operazioni batch/logica:**
  - `markAsRead/Unread` recupera i thread e poi applica label modifications in batch per id consolidati.
  - Gestione allegati tramite `messages.attachments.get` con conversione base64; parsing attachments ricorsivo.
  - Label mapping e cache locale (`labelIdCache`, `systemLabelIds`) per non rifare lookup.
- **Funzioni disponibili:** history list, thread get/list, count per folder, aliases, send draft/message, delete, label create/resolve.
- **Error handling:** wrapper `withErrorHandler`/`withSyncErrorHandler` con log standardizzato e fatal error handling.

## Microsoft Outlook (Zero-main `microsoft.ts`)
- **Graph client con auth middleware** (access token recuperato via context).
- **Batch PATCH via /$batch** per aggiornare read/unread su più messaggi in una singola chiamata (ottimo spunto per bulk move/update).
- **Folder count e normalizzazione** dei nomi di cartella (Inbox, Sent, Drafts, Bin, Archive, Spam) con uso di unread/total count.
- Funzioni per aliases (solo mail principale), list con query/pagination, attachments fetch, send/update/draft.
- Error handling con wrapper standardizzato e fatal error handling.

## Driver utils (Zero-main `driver/utils.ts`)
- Helper per decodifica base64, parsing semplice, standardizzazione errori (`StandardizedError`), sanitize context.

## Spunti di integrazione per MailAgent
- **Batch operations:** adottare batch PATCH/label modify per move/read/unread/move bulk (Gmail: modify labels in batch; Outlook: Graph /$batch).
- **Label/folder normalization:** introdurre cache e mapping per system labels/folders per evitare lookup ripetuti; normalizzare nomi di cartelle Microsoft come fa Zero-main.
- **Error handling wrapper:** creare helper comuni `withErrorHandler` per Google/Microsoft per log coerenti e gestione fatal/refresh.
- **Attachment handling:** consolidare download allegati e parsing ricorsivo (anche per inline/`message/rfc822`).
- **Thread-aware operations:** considerare operazioni su thread (mark read/unread per thread) per ridurre chiamate.
- **Config scope e permissions:** verificare scope correnti; se servono operazioni di invio/gestione etichette, allineare agli scope più ampi usati in Zero-main.
- **Batch read/unread/move dal frontend:** usare queue/batch API (Graph /$batch o Gmail batchModify) per ridurre carico e accoppiarlo con realtime throttling già introdotto.
