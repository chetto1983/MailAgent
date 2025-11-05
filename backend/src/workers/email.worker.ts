/**
 * @deprecated Questo worker è stato sostituito dal modulo email-sync.
 * Viene lasciato come placeholder per evitare avvii accidentali.
 */

console.error(
  '[MailAgent] Il worker legacy "email.worker.ts" è stato deprecato. ' +
    'Esegui il modulo BullMQ gestito da email-sync (SyncWorker) invece di questo file.',
);

process.exitCode = 1;
