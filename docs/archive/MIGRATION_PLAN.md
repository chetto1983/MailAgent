# Piano di Migrazione a Material Design 3 - Step by Step

> **Durata stimata:** 8-10 giorni (1 developer full-time)
> **Approccio:** Migrazione incrementale, feature per feature, con testing continuo

---

## 📋 Pre-requisiti

Prima di iniziare la migrazione:

- ✅ Backup del codice attuale (git commit/branch)
- ✅ Documentazione API backend completata
- ✅ Design system review e approvazione stakeholder
- ✅ Ambiente di sviluppo funzionante
- ✅ Browser di testing preparati (Chrome, Firefox, Safari, Edge)

---

## 🚀 Fase 1: Setup e Configurazione (Giorno 1)

### Step 1.1: Installazione Dipendenze

```bash
cd frontend

# Material UI core
npm install @mui/material@^5.14.0 @emotion/react@^11.11.0 @emotion/styled@^11.11.0

# Roboto font
npm install @fontsource/roboto

# Icons (opzionale, già usi Lucide)
# npm install @mui/icons-material
```

**Verifica installazione:**
```bash
npm list @mui/material
# Dovrebbe mostrare: @mui/material@5.14.x
```

### Step 1.2: Configurazione Tema

**File già creati:**
- ✅ `frontend/lib/theme/material-theme.ts` (creato sopra)

**Azione:** Verifica che il file sia presente e corretto.

### Step 1.3: Integrazione in _app.tsx

**File:** `frontend/pages/_app.tsx`

**Modifica:**

```diff
import type { AppProps } from 'next/app';
- import { ThemeProvider } from 'next-themes';
+ import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
+ import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
+ import { lightTheme, darkTheme } from '@/lib/theme/material-theme';
import { AuthProvider } from '@/lib/context/auth-context';
import '@/styles/globals.css';
+ import '@fontsource/roboto/300.css';
+ import '@fontsource/roboto/400.css';
+ import '@fontsource/roboto/500.css';
+ import '@fontsource/roboto/700.css';

+ function MaterialThemeWrapper({ children }: { children: React.ReactNode }) {
+   const { theme } = useTheme();
+   const muiTheme = theme === 'dark' ? darkTheme : lightTheme;
+
+   return (
+     <MuiThemeProvider theme={muiTheme}>
+       <CssBaseline />
+       {children}
+     </MuiThemeProvider>
+   );
+ }

export default function App({ Component, pageProps }: AppProps) {
  return (
-   <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
+   <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
+     <MaterialThemeWrapper>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
+     </MaterialThemeWrapper>
-   </ThemeProvider>
+   </NextThemeProvider>
  );
}
```

### Step 1.4: Testing Setup

**Avvia dev server:**
```bash
npm run dev
```

**Verifica:**
1. Apri http://localhost:3001
2. Apri DevTools → Console
3. **NON** devono esserci errori Material UI
4. Verifica che `CssBaseline` sia applicato (reset CSS globale)

**Checkpoint:**
- [ ] Server avviato senza errori
- [ ] Console pulita (no warnings MUI)
- [ ] Light/Dark mode funzionante (toggle con DevTools)

---

## 🎨 Fase 2: Migrazione Layout e Navigazione (Giorno 2-3)

### Step 2.1: Backup Layout Attuale

```bash
# Rinomina il layout attuale per mantenerlo come riferimento
cp components/dashboard/DashboardLayout.tsx components/dashboard/DashboardLayout.old.tsx
```

### Step 2.2: Sostituisci Layout con Material

**File:** `frontend/components/dashboard/DashboardLayout.tsx`

**Azione:** Sostituisci **completamente** il contenuto con `MaterialDashboardLayout.tsx` (già creato sopra).

**Verifica diff:**
```bash
git diff components/dashboard/DashboardLayout.tsx
```

Dovresti vedere:
- ❌ Rimosso: Glassmorphism styles, glows decorativi
- ❌ Rimosso: Doppia navigazione mobile
- ✅ Aggiunto: AppBar Material
- ✅ Aggiunto: Drawer (permanent + temporary)
- ✅ Aggiunto: BottomNavigation mobile

### Step 2.3: Update Pagine Dashboard

**File:** Tutte le pagine in `frontend/pages/dashboard/*.tsx`

**Modifica:** Nessuna! Il layout è già utilizzato tramite wrapper, quindi le pagine continuano a funzionare.

**Test visivo:**

1. Vai a `/dashboard/index` (AI Copilot)
2. Verifica:
   - ✅ AppBar top con logo e avatar
   - ✅ Drawer laterale (desktop)
   - ✅ Bottom nav (mobile, < 905px)
   - ✅ Nessuna doppia navigazione su mobile
   - ✅ Theme toggle funzionante (menu avatar)

### Step 2.4: Test Responsive

**Breakpoints da testare:**

| Larghezza | Atteso |
|-----------|--------|
| 360px | Bottom nav visible, drawer hidden, hamburger button visible |
| 768px | Bottom nav visible, drawer hidden, hamburger button visible |
| 905px | Bottom nav hidden, permanent drawer visible |
| 1280px | Bottom nav hidden, permanent drawer visible |

**Strumento:** Chrome DevTools → Toggle device toolbar

**Checkpoint:**
- [ ] Desktop: Drawer permanente visibile
- [ ] Mobile: Bottom nav visibile, drawer nascosto
- [ ] Hamburger menu apre temporary drawer su mobile
- [ ] Navigazione funziona su tutti i breakpoints
- [ ] Logout button funzionante (desktop menu, mobile drawer)

---

## 📧 Fase 3: Migrazione Componenti Email (Giorno 4-6)

### Step 3.1: EmailList Component Material

**File:** `frontend/components/dashboard/EmailList.tsx`

**Prima (Tailwind):**
```tsx
<div className="flex flex-col gap-2">
  {emails.map(email => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {/* Email content */}
    </div>
  ))}
</div>
```

**Dopo (Material):**

```tsx
import {
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Divider,
  Paper,
  Box,
} from '@mui/material';
import { Mail } from 'lucide-react';
import { Email } from '@/lib/api/email';

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailClick: (email: Email) => void;
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailClick,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No emails found
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <List sx={{ p: 0 }}>
        {emails.map((email, index) => (
          <React.Fragment key={email.id}>
            <ListItemButton
              selected={email.id === selectedEmailId}
              onClick={() => onEmailClick(email)}
              sx={{
                py: 2,
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: email.read ? 'grey.400' : 'primary.main',
                    width: 40,
                    height: 40,
                  }}
                >
                  {email.from.name?.[0] || email.from.email[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: email.read ? 400 : 600,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {email.subject || '(No subject)'}
                    </Typography>
                    {!email.read && (
                      <Chip
                        label="New"
                        color="primary"
                        size="small"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {email.from.name || email.from.email}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {email.preview || email.textContent?.substring(0, 120)}
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
            {index < emails.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
}
```

**Test:**
1. Vai a `/dashboard/email`
2. Verifica:
   - ✅ Lista email in Material Card
   - ✅ Avatar con iniziale mittente
   - ✅ Chip "New" su email non lette
   - ✅ Selezione email (background highlight)
   - ✅ Hover states visibili
   - ✅ Divider tra email

### Step 3.2: EmailView Component Material

**File:** `frontend/components/dashboard/EmailView.tsx`

**Sostituisci con:**

```tsx
import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Button,
  Stack,
} from '@mui/material';
import {
  Reply,
  Forward,
  Trash2,
  Archive,
  Star,
  StarOff,
  MoreVertical,
} from 'lucide-react';
import { Email } from '@/lib/api/email';

interface EmailViewProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onToggleStar?: () => void;
}

export function EmailView({
  email,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onToggleStar,
}: EmailViewProps) {
  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 48,
              height: 48,
              fontSize: '1.25rem',
            }}
          >
            {email.from.name?.[0] || email.from.email[0].toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h2"
              gutterBottom
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email.subject || '(No subject)'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From:{' '}
              <Typography component="span" variant="body2" fontWeight={500}>
                {email.from.name || email.from.email}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(email.receivedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Stack direction="row" spacing={0.5}>
            {onToggleStar && (
              <IconButton
                size="small"
                aria-label="star email"
                onClick={onToggleStar}
                sx={{ width: 40, height: 40 }}
              >
                {email.starred ? <Star size={18} /> : <StarOff size={18} />}
              </IconButton>
            )}
            {onArchive && (
              <IconButton
                size="small"
                aria-label="archive email"
                onClick={onArchive}
                sx={{ width: 40, height: 40 }}
              >
                <Archive size={18} />
              </IconButton>
            )}
            <IconButton
              size="small"
              aria-label="delete email"
              onClick={onDelete}
              color="error"
              sx={{ width: 40, height: 40 }}
            >
              <Trash2 size={18} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="more actions"
              sx={{ width: 40, height: 40 }}
            >
              <MoreVertical size={18} />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 3 }}>
        <Typography
          variant="body1"
          component="div"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            mb: 3,
          }}
        >
          {email.textContent || email.htmlContent || '(Empty email)'}
        </Typography>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Attachments ({email.attachments.length})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {email.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  label={attachment.filename}
                  variant="outlined"
                  size="small"
                  clickable
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Actions footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            startIcon={<Reply />}
            onClick={onReply}
            sx={{ minWidth: 120 }}
          >
            Reply
          </Button>
          <Button
            variant="outlined"
            startIcon={<Forward />}
            onClick={onForward}
            sx={{ minWidth: 120 }}
          >
            Forward
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
```

**Test:**
1. Seleziona un'email dalla lista
2. Verifica:
   - ✅ Avatar con iniziale mittente
   - ✅ Subject, from, date formattati
   - ✅ Action buttons (star, archive, delete, more)
   - ✅ Body text leggibile
   - ✅ Attachments come chips
   - ✅ Reply/Forward buttons funzionanti

### Step 3.3: EmailComposer Component Material

**File:** `frontend/components/dashboard/email/EmailComposer.tsx`

**Modifiche principali:**

```tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X, Paperclip, Send } from 'lucide-react';
import { EmailDraft } from '@/lib/api/email';

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (draft: EmailDraft) => Promise<void>;
  mode?: 'compose' | 'reply' | 'forward';
  originalEmail?: Email | null;
}

export function EmailComposer({
  open,
  onClose,
  onSend,
  mode = 'compose',
  originalEmail,
}: EmailComposerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend({ to, subject, body });
      onClose();
    } catch (error) {
      console.error('Failed to send:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {mode === 'compose' ? 'New Email' : mode === 'reply' ? 'Reply' : 'Forward'}
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            autoFocus
            label="To"
            type="email"
            fullWidth
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            helperText="Enter recipient email address"
          />

          <TextField
            label="Subject"
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <TextField
            label="Message"
            fullWidth
            multiline
            rows={isMobile ? 10 : 14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message here..."
          />

          {/* Attachments area (future) */}
          <Box>
            <Button
              startIcon={<Paperclip />}
              variant="outlined"
              size="small"
              disabled
            >
              Attach files (Coming soon)
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={<Send />}
          disabled={!to || !subject || sending}
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

**Test:**
1. Click "Compose" button
2. Verifica:
   - ✅ Dialog full screen su mobile
   - ✅ Dialog centered su desktop
   - ✅ Form fields accessibili (Tab order)
   - ✅ Send button disabilitato se campi vuoti
   - ✅ Close button (X) funzionante
   - ✅ Cancel button funzionante

**Checkpoint Fase 3:**
- [ ] EmailList mostra lista con Material components
- [ ] EmailView mostra dettaglio email formattato
- [ ] EmailComposer dialog funzionante
- [ ] Responsive su mobile/desktop
- [ ] Accessibilità keyboard navigation funzionante

---

## 🤖 Fase 4: Componenti AI Assistant (Giorno 7)

### Step 4.1: AiAssistant Component Material

**File:** `frontend/components/dashboard/AiAssistant.tsx`

**Modifiche:**
- Sostituisci Tailwind cards con Material `Paper`
- Usa `TextField` Material per input
- Usa `Button` Material per send
- Usa `Chip` Material per quick prompts

**Esempio:**

```tsx
import {
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  Stack,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import { Send, Mic, Volume2, Sparkles, User } from 'lucide-react';

export function AiAssistant() {
  // ... stato esistente

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: { xs: '60vh', md: '80vh' },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles size={20} />
          <Typography variant="h6">AI Assistant</Typography>
        </Box>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: message.role === 'user' ? 'secondary.main' : 'primary.main',
              }}
            >
              {message.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {message.content}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Input area */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Ask AI assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            size="small"
            multiline
            maxRows={3}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim()}
            sx={{ width: 48, height: 48 }}
          >
            <Send size={20} />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
}
```

**Checkpoint:**
- [ ] Chat interface Material Design
- [ ] Scrollable message area
- [ ] Input con multiline
- [ ] Send button accessibile
- [ ] Avatar per user/assistant distinguibili

---

## 🎯 Fase 5: Testing e Refinement (Giorno 8-10)

### Step 5.1: Accessibility Audit

**Tool: Lighthouse (Chrome DevTools)**

```bash
# 1. Apri Chrome DevTools (F12)
# 2. Vai a "Lighthouse" tab
# 3. Seleziona:
#    - Categories: Accessibility, Performance, Best Practices
#    - Device: Desktop + Mobile
# 4. Run audit
```

**Target Score:**
- Accessibility: ≥ 90
- Performance: ≥ 85
- Best Practices: ≥ 90

**Common issues e fix:**

| Issue | Fix |
|-------|-----|
| Missing ARIA labels | Aggiungi `aria-label` a IconButton |
| Insufficient contrast | Usa palette Material (già conforme) |
| Touch targets too small | Usa min 48x48px (già configurato) |
| Missing alt text | Aggiungi alt a tutte le immagini |

### Step 5.2: Keyboard Navigation Test

**Checklist:**

1. **Tab order logico:**
   - [ ] AppBar → Drawer → Main content → Bottom nav
   - [ ] Form fields in ordine visivo

2. **Focus indicators visibili:**
   - [ ] Tutti i button hanno outline al focus
   - [ ] Link hanno outline al focus

3. **Shortcuts funzionanti:**
   - [ ] `Escape` chiude dialog/drawer
   - [ ] `Enter` submit form
   - [ ] Arrow keys navigano liste (se implementato)

### Step 5.3: Responsive Testing

**Devices da testare:**

| Device | Width | Test |
|--------|-------|------|
| iPhone SE | 375px | Bottom nav visible, drawer temporary |
| iPhone 12 Pro | 390px | Same as above |
| iPad | 768px | Bottom nav visible, drawer temporary |
| iPad Pro | 1024px | Permanent drawer visible, no bottom nav |
| Desktop | 1280px | Permanent drawer, full features |

**Chrome DevTools → Toggle device toolbar → Select device**

### Step 5.4: Performance Optimization

**Bundle Size Check:**

```bash
npm run build

# Analizza output:
# - Check "First Load JS" per ogni route
# - Target: < 250 KB per page
```

**Tree-shaking verification:**

```bash
# Installa analyzer
npm install -D @next/bundle-analyzer

# In next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});

# Run analysis
ANALYZE=true npm run build
```

**Ottimizzazioni:**

1. **Dynamic imports per componenti pesanti:**
```tsx
import dynamic from 'next/dynamic';

const EmailComposer = dynamic(() => import('@/components/dashboard/email/EmailComposer'), {
  ssr: false,
  loading: () => <CircularProgress />,
});
```

2. **Image optimization:**
```tsx
import Image from 'next/image';

<Image
  src={avatar}
  alt="User avatar"
  width={40}
  height={40}
  priority={false}
/>
```

### Step 5.5: Cross-browser Testing

**Browsers:**
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

**Test:**
1. Navigazione funziona
2. Theme toggle funziona
3. Animazioni smooth (no jank)
4. Font rendering corretto

---

## 🚢 Fase 6: Deploy e Monitoring (Giorno 10)

### Step 6.1: Pre-deployment Checklist

- [ ] Tutti i test passati (accessibility, responsive, keyboard)
- [ ] Bundle size ottimizzato (< 250 KB per route)
- [ ] Light/Dark mode funzionanti
- [ ] Mobile UX verificato su device reali
- [ ] Performance Lighthouse ≥ 85
- [ ] No console errors/warnings

### Step 6.2: Git Commit

```bash
git add .
git commit -m "feat: migrate to Material Design 3

- Replace Tailwind glassmorphism with Material elevation system
- Implement AppBar + Drawer + BottomNavigation
- Migrate EmailList, EmailView, EmailComposer to Material components
- Add light/dark theme with Material palette
- Improve accessibility (WCAG 2.1 AA compliant)
- Optimize responsive layout for mobile/tablet/desktop

BREAKING CHANGE: UI completely redesigned"
```

### Step 6.3: Deploy

```bash
# Build production
npm run build

# Test production build locally
npm run start

# Deploy (esempio Vercel)
vercel --prod
```

### Step 6.4: Post-deployment Monitoring

**Strumenti:**
1. **Vercel Analytics** (se usi Vercel)
2. **Google Analytics** (user behavior)
3. **Sentry** (error tracking)

**Metriche da monitorare:**
- Core Web Vitals (LCP, FID, CLS)
- Bounce rate
- Session duration
- Error rate

---

## 📚 Riferimenti Rapidi

### Componenti Material UI più usati

| Componente | Uso | Import |
|------------|-----|--------|
| `Button` | CTA, actions | `@mui/material/Button` |
| `IconButton` | Icon-only actions | `@mui/material/IconButton` |
| `TextField` | Form inputs | `@mui/material/TextField` |
| `Paper` | Cards, containers | `@mui/material/Paper` |
| `List` | Email list, nav | `@mui/material/List` |
| `Dialog` | Modals | `@mui/material/Dialog` |
| `AppBar` | Top navigation | `@mui/material/AppBar` |
| `Drawer` | Side navigation | `@mui/material/Drawer` |
| `BottomNavigation` | Mobile nav | `@mui/material/BottomNavigation` |
| `Chip` | Tags, badges | `@mui/material/Chip` |
| `Avatar` | User images | `@mui/material/Avatar` |
| `Snackbar` | Toasts | `@mui/material/Snackbar` |

### Palette Colors Quick Reference

```tsx
// In sx prop:
bgcolor: 'primary.main'      // #3F51B5
bgcolor: 'primary.light'     // #5C6BC0
bgcolor: 'primary.dark'      // #303F9F
bgcolor: 'secondary.main'    // #FFC107
bgcolor: 'error.main'        // #F44336
bgcolor: 'success.main'      // #4CAF50
bgcolor: 'background.paper'  // #FFFFFF (light) / #1E1E1E (dark)
bgcolor: 'background.default' // #FAFAFA (light) / #121212 (dark)
```

### Spacing System

```tsx
// In sx prop (1 unit = 8px):
p: 1        // padding: 8px
p: 2        // padding: 16px
p: 3        // padding: 24px
pt: 2       // padding-top: 16px
px: 3       // padding-left + padding-right: 24px
m: 2        // margin: 16px
gap: 2      // gap: 16px
```

---

## 🆘 Troubleshooting

### Errore: "Cannot find module '@mui/material'"

**Soluzione:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Errore: Theme non applicato

**Verifica:**
1. `ThemeProvider` wrappa tutta l'app in `_app.tsx`
2. `useTheme()` hook chiamato dentro `ThemeProvider`
3. `CssBaseline` incluso

### Componenti Tailwind ancora visibili

**Soluzione:**
1. Verifica di aver sostituito TUTTI i componenti
2. Cerca `.tsx` files con `className=` patterns Tailwind
3. Usa VSCode search: `className=".*rounded-.*blur`

### Performance issues

**Checklist:**
- [ ] Immagini ottimizzate con `next/image`
- [ ] Componenti pesanti lazy-loaded
- [ ] No inline arrow functions in render
- [ ] React DevTools Profiler: Check re-renders

---

**Fine Piano di Migrazione**

Per domande o supporto, consulta:
- [Material UI Docs](https://mui.com/material-ui/)
- [Next.js Docs](https://nextjs.org/docs)
- [Design System Documentation](./DESIGN_SYSTEM_REDESIGN.md)
