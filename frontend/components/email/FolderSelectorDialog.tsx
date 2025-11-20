import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Inbox, Send, Archive, Trash2, Folder } from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';

interface FolderSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (folder: string) => void;
  selectedCount: number;
}

const COMMON_FOLDERS = [
  { id: 'INBOX', name: 'Inbox', icon: <Inbox size={20} /> },
  { id: 'SENT', name: 'Sent', icon: <Send size={20} /> },
  { id: 'ARCHIVE', name: 'Archive', icon: <Archive size={20} /> },
  { id: 'TRASH', name: 'Trash', icon: <Trash2 size={20} /> },
  { id: 'DRAFTS', name: 'Drafts', icon: <Folder size={20} /> },
  { id: 'SPAM', name: 'Spam', icon: <Folder size={20} /> },
];

/**
 * FolderSelectorDialog - Dialog for selecting a folder to move emails to
 *
 * Features:
 * - Lists common email folders
 * - Single selection
 */
export const FolderSelectorDialog: React.FC<FolderSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  selectedCount,
}) => {
  const t = useTranslations();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const handleSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  const handleApply = () => {
    if (selectedFolder) {
      onSelect(selectedFolder);
      onClose();
      setSelectedFolder(null);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedFolder(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t.dashboard.email.bulkBar.moveToFolder} ({selectedCount} selected)
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <List>
          {COMMON_FOLDERS.map((folder) => (
            <ListItem key={folder.id} disablePadding>
              <ListItemButton
                selected={selectedFolder === folder.id}
                onClick={() => handleSelect(folder.id)}
              >
                <ListItemIcon>{folder.icon}</ListItemIcon>
                <ListItemText primary={folder.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t.common.cancel}</Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!selectedFolder}
        >
          Move
        </Button>
      </DialogActions>
    </Dialog>
  );
};
