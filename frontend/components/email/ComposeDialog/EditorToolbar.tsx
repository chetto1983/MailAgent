import React from 'react';
import { Box, IconButton, Divider, Tooltip } from '@mui/material';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { Editor } from '@tiptap/core';

interface EditorToolbarProps {
  /**
   * TipTap editor instance
   */
  editor: Editor | null;
}

/**
 * Toolbar for TipTap editor with rich text formatting buttons
 *
 * Features:
 * - Text formatting: Bold, Italic, Underline, Strikethrough
 * - Headings: H1, H2, H3
 * - Lists: Bullet, Numbered
 * - Blockquote
 * - Undo/Redo
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Undo/Redo */}
      <Tooltip title="Undo">
        <span>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            sx={{
              width: 32,
              height: 32,
              '&.Mui-disabled': { opacity: 0.3 }
            }}
          >
            <Undo2 size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Redo">
        <span>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            sx={{
              width: 32,
              height: 32,
              '&.Mui-disabled': { opacity: 0.3 }
            }}
          >
            <Redo2 size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Headings */}
      <Tooltip title="Heading 1">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('heading', { level: 1 }) ? 'action.selected' : 'transparent',
          }}
        >
          <Heading1 size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Heading 2">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('heading', { level: 2 }) ? 'action.selected' : 'transparent',
          }}
        >
          <Heading2 size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Heading 3">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('heading', { level: 3 }) ? 'action.selected' : 'transparent',
          }}
        >
          <Heading3 size={18} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Text Formatting */}
      <Tooltip title="Bold">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('bold') ? 'action.selected' : 'transparent',
            fontWeight: editor.isActive('bold') ? 'bold' : 'normal',
          }}
        >
          <Bold size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Italic">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('italic') ? 'action.selected' : 'transparent',
          }}
        >
          <Italic size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Underline">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('underline') ? 'action.selected' : 'transparent',
          }}
        >
          <UnderlineIcon size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Strikethrough">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('strike') ? 'action.selected' : 'transparent',
          }}
        >
          <Strikethrough size={18} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Lists */}
      <Tooltip title="Bullet List">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('bulletList') ? 'action.selected' : 'transparent',
          }}
        >
          <List size={18} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Numbered List">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('orderedList') ? 'action.selected' : 'transparent',
          }}
        >
          <ListOrdered size={18} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Blockquote */}
      <Tooltip title="Quote">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          sx={{
            width: 32,
            height: 32,
            bgcolor: editor.isActive('blockquote') ? 'action.selected' : 'transparent',
          }}
        >
          <Quote size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
