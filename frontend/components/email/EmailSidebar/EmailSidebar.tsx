import React, { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from '@mui/material';
import { Mail, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/router';
import { useFoldersStore } from '@/stores/folders-store';
import { useTranslations } from '@/lib/hooks/use-translations';

/**
 * Folder item with provider info
 */
export interface FolderItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  color?: string;
  providerId?: string;
  providerEmail?: string;
  specialUse?: string;
}

/**
 * Group of folders by provider
 */
export interface FolderGroup {
  providerId: string;
  providerEmail: string;
  folders: FolderItem[];
}

/**
 * Props for EmailSidebar component
 */
interface EmailSidebarProps {
  /**
   * Folders grouped by provider
   */
  folderGroups: FolderGroup[];

  /**
   * Currently selected folder ID
   */
  selectedFolderId?: string | null;

  /**
   * Callback when a folder is selected
   */
  onFolderSelect: (folderId: string) => void;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Show compose button
   */
  showComposeButton?: boolean;

  /**
   * Custom compose button handler
   */
  onCompose?: () => void;
}

/**
 * EmailSidebar - Sidebar component for email navigation
 *
 * Displays:
 * - Compose button
 * - Folders grouped by provider (with accordions)
 * - Unread counts per folder
 *
 * @example
 * ```tsx
 * <EmailSidebar
 *   folderGroups={foldersByProvider}
 *   selectedFolderId={selectedFolderId}
 *   onFolderSelect={(id) => setSelectedFolderId(id)}
 *   loading={foldersLoading}
 * />
 * ```
 */
export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  folderGroups,
  selectedFolderId,
  onFolderSelect,
  loading = false,
  showComposeButton = true,
  onCompose,
}) => {
  const router = useRouter();
  const t = useTranslations();
  const countsByFolderId = useFoldersStore((state) => state.countsByFolderId);

  // Track which providers are expanded
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(() => {
    // Auto-expand all providers by default
    return new Set(folderGroups.map((g) => g.providerId));
  });

  // Default compose handler
  const handleCompose = () => {
    if (onCompose) {
      onCompose();
    } else {
      router.push('/dashboard/email/compose');
    }
  };

  // Toggle provider expansion
  const toggleProvider = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (expandedProviders.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  // Get live count for a folder
  const getFolderCount = (folderId: string): number | undefined => {
    const liveCounts = countsByFolderId[folderId];
    return liveCounts?.unreadCount;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
      }}
    >
      {/* Compose Button */}
      {showComposeButton && (
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Mail size={18} />}
            onClick={handleCompose}
          >
            {t.common.compose}
          </Button>
        </Box>
      )}

      {/* Folders List */}
      <List sx={{ px: 1, flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={18} />
          </Box>
        ) : folderGroups.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t.dashboard.email.noProviders}
            </Typography>
          </Box>
        ) : (
          folderGroups.map((group) => (
            <Accordion
              key={group.providerId}
              expanded={expandedProviders.has(group.providerId)}
              onChange={() => toggleProvider(group.providerId)}
              disableGutters
              elevation={0}
              sx={{
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0 },
              }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown size={16} />}
                sx={{
                  minHeight: 40,
                  px: 2,
                  '&.Mui-expanded': { minHeight: 40 },
                  '& .MuiAccordionSummary-content': { my: 0.5 },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {group.providerEmail}
                </Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <List sx={{ py: 0 }}>
                  {group.folders.map((folder) => {
                    const displayCount = getFolderCount(folder.id) ?? folder.count;
                    const isSelected = selectedFolderId === folder.id;

                    return (
                      <ListItemButton
                        key={folder.id}
                        selected={isSelected}
                        onClick={() => onFolderSelect(folder.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          mx: 1,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 36,
                            color: folder.color || 'inherit',
                          }}
                        >
                          {folder.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={folder.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 600 : 500,
                          }}
                        />
                        {displayCount != null && displayCount > 0 && (
                          <Chip
                            label={displayCount}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </List>
    </Paper>
  );
};
