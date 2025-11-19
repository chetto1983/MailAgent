import {
  Inbox,
  Send,
  Trash2,
  Archive,
  Star,
  FileText,
  Ban,
  Folder as FolderIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Mapping di nomi cartelle localizzati a nomi standard
 */
const FOLDER_MAPPINGS: Record<string, string> = {
  // Inbox
  'posta in arrivo': 'INBOX',
  'inbox': 'INBOX',
  'posteingang': 'INBOX',
  'boîte de réception': 'INBOX',

  // Sent
  'posta inviata': 'SENT',
  'sent': 'SENT',
  'sent items': 'SENT',
  'elementi inviati': 'SENT',
  'inviata': 'SENT',
  'gesendete objekte': 'SENT',
  'envoyés': 'SENT',

  // Trash
  'posta eliminata': 'TRASH',
  'trash': 'TRASH',
  'deleted items': 'TRASH',
  'elementi eliminati': 'TRASH',
  'cestino': 'TRASH',
  'gelöschte objekte': 'TRASH',
  'corbeille': 'TRASH',
  'bin': 'TRASH',

  // Drafts
  'bozze': 'DRAFTS',
  'draft': 'DRAFTS',
  'drafts': 'DRAFTS',
  'entwürfe': 'DRAFTS',
  'brouillons': 'DRAFTS',

  // Spam/Junk
  'posta indesiderata': 'JUNK',
  'spam': 'JUNK',
  'junk': 'JUNK',
  'junk email': 'JUNK',
  'courrier indésirable': 'JUNK',

  // Archive
  'archive': 'ARCHIVE',
  'archivio': 'ARCHIVE',
  'all mail': 'ARCHIVE',
  'tous les messages': 'ARCHIVE',

  // Outbox
  'posta in uscita': 'OUTBOX',
  'outbox': 'OUTBOX',
  'boîte d\'envoi': 'OUTBOX',
};

/**
 * Mapping di folder types a icone Lucide
 */
const FOLDER_ICON_MAP: Record<string, LucideIcon> = {
  'inbox': Inbox,
  'sent': Send,
  'trash': Trash2,
  'archive': Archive,
  'starred': Star,
  'drafts': FileText,
  'junk': Ban,
  'spam': Ban,
  'outbox': Send,
};

/**
 * Normalizza un nome di cartella localizzato a un nome standard
 *
 * @param name - Nome della cartella (es. "Posta in arrivo", "Sent Items")
 * @param specialUse - Tipo speciale della cartella (opzionale, es. "\\Inbox")
 * @returns Nome normalizzato (es. "INBOX", "SENT")
 *
 * @example
 * ```typescript
 * normalizeFolderName('Posta in arrivo') // 'INBOX'
 * normalizeFolderName('Sent Items') // 'SENT'
 * normalizeFolderName('Custom', '\\Inbox') // 'INBOX'
 * ```
 */
export function normalizeFolderName(name: string, specialUse?: string | null): string {
  // Se specialUse è fornito, usalo direttamente
  if (specialUse) {
    const normalized = specialUse.replace(/\\/g, '').toUpperCase();
    return normalized;
  }

  // Normalizza il nome: lowercase e trim
  const normalizedName = name.toLowerCase().trim();

  // Cerca nel mapping
  const mappedName = FOLDER_MAPPINGS[normalizedName];

  // Ritorna il nome mappato o il nome originale se non trovato
  return mappedName || name;
}

/**
 * Ottiene l'icona appropriata per un tipo di cartella
 *
 * @param specialUse - Tipo speciale della cartella (es. "INBOX", "\\Sent")
 * @returns Componente icona Lucide
 *
 * @example
 * ```typescript
 * const Icon = getFolderIcon('INBOX'); // Inbox icon
 * <Icon size={20} />
 * ```
 */
export function getFolderIcon(specialUse?: string | null): LucideIcon {
  if (!specialUse) return FolderIcon;

  // Normalizza: rimuovi backslash e converti a lowercase
  const normalized = specialUse.replace(/\\/g, '').toLowerCase();

  // Cerca nel mapping
  const Icon = FOLDER_ICON_MAP[normalized];

  return Icon || FolderIcon;
}

/**
 * Determina se una cartella è una cartella di sistema speciale
 *
 * @param folderName - Nome normalizzato della cartella
 * @returns true se è una cartella speciale (INBOX, SENT, etc.)
 *
 * @example
 * ```typescript
 * isSpecialFolder('INBOX') // true
 * isSpecialFolder('Custom Folder') // false
 * ```
 */
export function isSpecialFolder(folderName: string): boolean {
  const specialFolders = new Set([
    'INBOX',
    'SENT',
    'TRASH',
    'DRAFTS',
    'JUNK',
    'SPAM',
    'ARCHIVE',
    'OUTBOX',
    'STARRED',
  ]);

  return specialFolders.has(folderName.toUpperCase());
}

/**
 * Ottiene un colore suggerito per una cartella basato sul tipo
 *
 * @param specialUse - Tipo speciale della cartella
 * @returns Colore hex o undefined
 *
 * @example
 * ```typescript
 * getFolderColor('INBOX') // '#1976d2'
 * getFolderColor('TRASH') // '#d32f2f'
 * ```
 */
export function getFolderColor(specialUse?: string | null): string | undefined {
  if (!specialUse) return undefined;

  const normalized = specialUse.replace(/\\/g, '').toLowerCase();

  const colorMap: Record<string, string> = {
    'inbox': '#1976d2',
    'sent': '#388e3c',
    'trash': '#d32f2f',
    'drafts': '#f57c00',
    'junk': '#616161',
    'spam': '#616161',
    'archive': '#7b1fa2',
    'starred': '#fbc02d',
  };

  return colorMap[normalized];
}

/**
 * Ottiene un badge count display text
 *
 * @param count - Numero di email
 * @param max - Massimo da visualizzare (default: 99)
 * @returns Stringa formattata (es. "5", "99+")
 *
 * @example
 * ```typescript
 * formatBadgeCount(5) // '5'
 * formatBadgeCount(150) // '99+'
 * ```
 */
export function formatBadgeCount(count: number, max: number = 99): string {
  if (count <= 0) return '';
  if (count > max) return `${max}+`;
  return count.toString();
}
