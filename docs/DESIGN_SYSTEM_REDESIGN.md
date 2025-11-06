# MailAgent - Redesign Completo Material Design 3

> **Obiettivo:** Trasformare l'attuale interfaccia in un'esperienza utente moderna, accessibile e mobile-friendly seguendo i principi di Material Design 3 (Material You).

---

## 📋 Indice

1. [Analisi Criticità Attuali](#analisi-criticità-attuali)
2. [Principi Guida Material Design 3](#principi-guida)
3. [Sistema Cromatico](#sistema-cromatico)
4. [Tipografia e Scala](#tipografia)
5. [Elevazione e Profondità](#elevazione)
6. [Layout e Griglia](#layout)
7. [Navigazione](#navigazione)
8. [Componenti Chiave](#componenti)
9. [Animazioni e Transizioni](#animazioni)
10. [Accessibilità](#accessibilità)
11. [Piano di Implementazione](#implementazione)

---

## 🔴 Analisi Criticità Attuali

### Problemi UX/UI Identificati

| Problema | Impatto | Priorità |
|----------|---------|----------|
| **Navigazione duplicata mobile** (hamburger + bottom nav) | Confusione utente, spazio sprecato | 🔴 Alta |
| **Contrasti insufficienti** (white/5, white/10) | WCAG 2.1 non rispettato, leggibilità scarsa | 🔴 Alta |
| **Dark mode fisso** senza opzione light | Inaccessibile in ambienti luminosi | 🟡 Media |
| **Glassmorphism eccessivo** | Gerarchia visiva appiattita | 🟡 Media |
| **Focus states invisibili** | Navigazione keyboard impossibile | 🔴 Alta |
| **Touch targets < 48px** | Difficoltà su mobile | 🔴 Alta |
| **Effetti decorativi distraenti** (blur-[120px] glows) | Performance e accessibilità | 🟢 Bassa |

---

## 🎨 Principi Guida Material Design 3

Material Design 3 si basa su **4 pilastri fondamentali**:

### 1. **Personalizzazione** (Material You)
- Palette colori dinamica basata su tonalità chiave
- Adattamento al contesto utente (light/dark mode)
- Coerenza tra superficie e contenuto

### 2. **Accessibilità First**
- Contrasto minimo **4.5:1** per testo normale
- Contrasto minimo **3:1** per testo grande (18pt+)
- Touch targets minimi **48x48px**
- Focus indicators visibili e chiari

### 3. **Adattività Responsive**
- Layout fluidi con breakpoints Material:
  - **xs**: 0-600px (mobile)
  - **sm**: 600-905px (tablet portrait)
  - **md**: 905-1240px (tablet landscape)
  - **lg**: 1240-1440px (laptop)
  - **xl**: 1440px+ (desktop)

### 4. **Motion Design Naturale**
- Easing standard: `cubic-bezier(0.4, 0, 0.2, 1)`
- Durata: 150-300ms per micro-interazioni
- Transizioni significative, mai decorative

---

## 🌈 Sistema Cromatico

### Palette Primaria (Indigo)

Sostituisce l'attuale `sky-500` con una palette più ricca e accessibile:

```typescript
const primaryPalette = {
  50: '#E8EAF6',
  100: '#C5CAE9',
  200: '#9FA8DA',
  300: '#7986CB',
  400: '#5C6BC0',  // Primary Light
  500: '#3F51B5',  // Primary Main
  600: '#3949AB',  // Primary Dark
  700: '#303F9F',
  800: '#283593',
  900: '#1A237E',
};
```

**Utilizzo:**
- `500`: CTA principali, icone attive, link
- `600`: Stati hover/pressed su CTA
- `400`: Varianti light mode
- `700`: Varianti dark mode

### Palette Secondaria (Amber)

Sostituisce il `rose-500` per azioni distruttive:

```typescript
const secondaryPalette = {
  50: '#FFF8E1',
  100: '#FFECB3',
  200: '#FFE082',
  300: '#FFD54F',
  400: '#FFCA28',  // Secondary Light
  500: '#FFC107',  // Secondary Main
  600: '#FFB300',  // Secondary Dark
  700: '#FFA000',
  800: '#FF8F00',
  900: '#FF6F00',
};
```

### Palette Errore (Deep Orange)

Per stati distruttivi e alert:

```typescript
const errorPalette = {
  main: '#F44336',
  light: '#E57373',
  dark: '#D32F2F',
  contrastText: '#FFFFFF',
};
```

### Palette Successo (Green)

```typescript
const successPalette = {
  main: '#4CAF50',
  light: '#81C784',
  dark: '#388E3C',
  contrastText: '#FFFFFF',
};
```

### Palette Neutra (Grey)

Sistema di grigi accessibili:

```typescript
const greyPalette = {
  50: '#FAFAFA',   // Sfondo light mode
  100: '#F5F5F5',  // Surface light
  200: '#EEEEEE',  // Border light
  300: '#E0E0E0',
  400: '#BDBDBD',
  500: '#9E9E9E',  // Disabled text
  600: '#757575',  // Secondary text
  700: '#616161',  // Primary text light
  800: '#424242',  // Surface dark
  900: '#212121',  // Sfondo dark mode
};
```

### Modalità Scura (Dark Mode)

Palette invertita con regolazioni per leggibilità:

```typescript
const darkModeColors = {
  background: {
    default: '#121212',  // Nero elevato (non puro)
    paper: '#1E1E1E',    // Surface 1
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',
    secondary: 'rgba(255, 255, 255, 0.60)',
    disabled: 'rgba(255, 255, 255, 0.38)',
  },
};
```

**Contrasti garantiti:**
- Testo primario su sfondo: **13.5:1** ✅
- Testo secondario su sfondo: **7.2:1** ✅
- Elementi interattivi: **4.5:1** ✅

---

## ✍️ Tipografia e Scala

### Font Family

Passa da Tailwind defaults a **Roboto** (Material Design standard):

```typescript
const typography = {
  fontFamily: [
    'Roboto',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Arial',
    'sans-serif',
  ].join(','),
};
```

**Alternative moderne:**
- **Inter**: Se vuoi un look più contemporaneo
- **Outfit**: Per un tocco più friendly

### Scala Tipografica

Material Design 3 usa una scala a **13 livelli**:

| Variante | Font Size | Line Height | Weight | Utilizzo |
|----------|-----------|-------------|--------|----------|
| **h1** | 96px | 112px | 300 (Light) | Hero titles |
| **h2** | 60px | 72px | 300 | Page headers |
| **h3** | 48px | 56px | 400 | Section titles |
| **h4** | 34px | 42px | 400 | Card headers |
| **h5** | 24px | 32px | 400 | List headers |
| **h6** | 20px | 32px | 500 (Medium) | Subsections |
| **subtitle1** | 16px | 28px | 400 | Secondary headers |
| **subtitle2** | 14px | 22px | 500 | Captions bold |
| **body1** | 16px | 24px | 400 | Paragraph text |
| **body2** | 14px | 20px | 400 | Dense text |
| **button** | 14px | 16px | 500 (UPPERCASE) | CTA labels |
| **caption** | 12px | 16px | 400 | Help text |
| **overline** | 10px | 16px | 400 (UPPERCASE) | Tags, labels |

**Implementazione MUI:**

```tsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',    // 40px su mobile
      fontWeight: 300,
      lineHeight: 1.2,
      '@media (min-width:905px)': {
        fontSize: '3.5rem',  // 56px su desktop
      },
    },
    h4: {
      fontSize: '1.75rem',   // 28px
      fontWeight: 400,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',      // 16px
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
  },
});
```

---

## 📦 Elevazione e Profondità

**Abbandona glassmorphism** (`backdrop-blur` + `bg-white/5`) in favore del **sistema di elevazione Material**.

### Livelli di Elevazione

Material Design usa **24 livelli** (0dp a 24dp):

| Livello | Box Shadow | Uso |
|---------|------------|-----|
| **0dp** | Nessuna | Sfondo, superficie base |
| **1dp** | `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)` | Card a riposo |
| **2dp** | `0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)` | Card hover |
| **4dp** | `0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)` | App Bar, Tabs |
| **8dp** | `0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)` | Drawer, Dialog |
| **16dp** | `0 20px 40px rgba(0,0,0,0.20)` | Modal backdrop |
| **24dp** | `0 25px 50px rgba(0,0,0,0.25)` | Floating Action Button |

**Esempio implementazione:**

```tsx
// Card a riposo
<Card elevation={1} sx={{ borderRadius: 2 }}>
  <CardContent>Content</CardContent>
</Card>

// Card hover (gestito automaticamente da MUI)
<Card
  elevation={1}
  sx={{
    '&:hover': { boxShadow: theme.shadows[2] },
    transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  }}
>
```

### Dark Mode Elevations

In dark mode, Material Design **aggiunge overlay bianchi** invece di ombre più scure:

```typescript
const darkModeElevations = {
  1: 'linear-gradient(0deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
  2: 'linear-gradient(0deg, rgba(255,255,255,0.07), rgba(255,255,255,0.07))',
  4: 'linear-gradient(0deg, rgba(255,255,255,0.09), rgba(255,255,255,0.09))',
  8: 'linear-gradient(0deg, rgba(255,255,255,0.11), rgba(255,255,255,0.11))',
  16: 'linear-gradient(0deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15))',
};
```

---

## 📐 Layout e Griglia

### Sistema a 8px Grid

**Tutto lo spacing si basa su multipli di 8px:**

```typescript
const spacing = {
  0: 0,
  0.5: '4px',   // 0.5 × 8
  1: '8px',     // 1 × 8
  2: '16px',    // 2 × 8
  3: '24px',    // 3 × 8
  4: '32px',    // 4 × 8
  5: '40px',    // 5 × 8
  6: '48px',    // 6 × 8
  8: '64px',    // 8 × 8
  10: '80px',   // 10 × 8
};
```

**Uso con MUI:**

```tsx
<Box sx={{ p: 3, mb: 2 }}>  // padding: 24px, margin-bottom: 16px
  <Typography>Content</Typography>
</Box>
```

### Grid Responsive

Material usa **12 colonne** con gutter di 16px (mobile) / 24px (desktop):

```tsx
import { Grid, Container } from '@mui/material';

<Container maxWidth="lg">
  <Grid container spacing={3}>
    <Grid item xs={12} md={8}>  {/* 100% mobile, 66% desktop */}
      <EmailList />
    </Grid>
    <Grid item xs={12} md={4}>  {/* 100% mobile, 33% desktop */}
      <AiAssistant />
    </Grid>
  </Grid>
</Container>
```

### Container Max Widths

| Breakpoint | Max Width |
|------------|-----------|
| xs | 100% |
| sm | 600px |
| md | 960px |
| lg | 1280px |
| xl | 1920px |

---

## 🧭 Navigazione

### Desktop: App Bar + Drawer

**Sostituisce l'attuale header con sticky nav pills.**

#### App Bar (Persistent Top Bar)

```tsx
import { AppBar, Toolbar, IconButton, Typography, Avatar } from '@mui/material';
import { Menu as MenuIcon, Sparkles } from 'lucide-react';

<AppBar
  position="sticky"
  elevation={4}
  sx={{
    backgroundColor: 'background.paper',
    color: 'text.primary',
  }}
>
  <Toolbar>
    <IconButton
      edge="start"
      color="inherit"
      aria-label="menu"
      onClick={handleDrawerToggle}
      sx={{ mr: 2, display: { md: 'none' } }}
    >
      <MenuIcon />
    </IconButton>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Sparkles size={24} />
      <Typography variant="h6" component="div" noWrap>
        MailAgent
      </Typography>
    </Box>

    <Box sx={{ flexGrow: 1 }} />

    <IconButton color="inherit">
      <Avatar alt="User" src="/avatar.jpg" sx={{ width: 32, height: 32 }} />
    </IconButton>
  </Toolbar>
</AppBar>
```

#### Navigation Drawer (Desktop Permanent, Mobile Temporary)

```tsx
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Mail, Sparkles, ServerCog, Settings } from 'lucide-react';

const drawerWidth = 240;

<Drawer
  variant="permanent"  // Desktop
  sx={{
    width: drawerWidth,
    flexShrink: 0,
    display: { xs: 'none', md: 'block' },
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      borderRight: '1px solid',
      borderColor: 'divider',
    },
  }}
>
  <Toolbar /> {/* Spacer per app bar */}
  <List>
    <ListItemButton selected={pathname === '/dashboard/index'}>
      <ListItemIcon>
        <Sparkles />
      </ListItemIcon>
      <ListItemText primary="AI Copilot" />
    </ListItemButton>

    <ListItemButton selected={pathname === '/dashboard/email'}>
      <ListItemIcon>
        <Mail />
      </ListItemIcon>
      <ListItemText primary="Inbox" />
    </ListItemButton>

    {/* Altri item... */}
  </List>
</Drawer>

{/* Mobile Temporary Drawer */}
<Drawer
  variant="temporary"
  open={mobileOpen}
  onClose={handleDrawerToggle}
  ModalProps={{ keepMounted: true }}
  sx={{
    display: { xs: 'block', md: 'none' },
    '& .MuiDrawer-paper': { width: drawerWidth },
  }}
>
  {/* Stesso contenuto del drawer desktop */}
</Drawer>
```

### Mobile: Bottom Navigation

**Sostituisce l'attuale doppia navigazione (hamburger + bottom nav).**

```tsx
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Mail, Sparkles, ServerCog, Settings } from 'lucide-react';

<Paper
  sx={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: { md: 'none' },  // Solo mobile
  }}
  elevation={8}
>
  <BottomNavigation
    value={activeTab}
    onChange={(event, newValue) => {
      setActiveTab(newValue);
      router.push(newValue);
    }}
  >
    <BottomNavigationAction
      label="Copilot"
      value="/dashboard/index"
      icon={<Sparkles />}
    />
    <BottomNavigationAction
      label="Inbox"
      value="/dashboard/email"
      icon={<Mail />}
    />
    <BottomNavigationAction
      label="Providers"
      value="/dashboard/providers"
      icon={<ServerCog />}
    />
    <BottomNavigationAction
      label="Settings"
      value="/dashboard/settings"
      icon={<Settings />}
    />
  </BottomNavigation>
</Paper>
```

**Vantaggi:**
- ✅ **Nessuna duplicazione** (1 sola nav su mobile)
- ✅ **Touch target 56px** (WCAG AAA)
- ✅ **Gesture familiare** (iOS/Android standard)

---

## 🧩 Componenti Chiave

### 1. Card (Email Item)

**Prima (Tailwind + Glassmorphism):**
```tsx
<div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
  {/* Content */}
</div>
```

**Dopo (Material Design):**
```tsx
import { Card, CardContent, CardActions, Typography, Chip } from '@mui/material';

<Card
  elevation={1}
  sx={{
    borderRadius: 2,  // 16px
    transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: (theme) => theme.shadows[2],
    },
  }}
>
  <CardContent>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      From: john@example.com
    </Typography>
    <Typography variant="h6" component="h3" gutterBottom>
      Meeting tomorrow at 3pm
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Hi team, just a reminder that we have our weekly sync...
    </Typography>
    <Chip label="Unread" color="primary" size="small" />
  </CardContent>
  <CardActions>
    <Button size="small">Reply</Button>
    <Button size="small">Forward</Button>
  </CardActions>
</Card>
```

### 2. Button (CTA)

**Varianti Material:**

```tsx
import { Button } from '@mui/material';

{/* Contained (Primary CTA) */}
<Button variant="contained" color="primary" size="large">
  Compose Email
</Button>

{/* Outlined (Secondary CTA) */}
<Button variant="outlined" color="primary" startIcon={<RefreshCw />}>
  Refresh
</Button>

{/* Text (Terziario) */}
<Button variant="text" color="primary">
  Cancel
</Button>

{/* Icon Button */}
<IconButton color="primary" aria-label="delete">
  <Trash2 />
</IconButton>
```

**Accessibility built-in:**
- ✅ Min height 36px (48px su mobile con `size="large"`)
- ✅ Focus ripple automatico
- ✅ ARIA labels automatici

### 3. List (Email List)

```tsx
import { List, ListItem, ListItemAvatar, ListItemText, Avatar, Divider } from '@mui/material';

<List sx={{ width: '100%', bgcolor: 'background.paper' }}>
  {emails.map((email, index) => (
    <React.Fragment key={email.id}>
      <ListItem alignItems="flex-start" button onClick={() => handleEmailClick(email)}>
        <ListItemAvatar>
          <Avatar alt={email.from.name} src={email.from.avatar} />
        </ListItemAvatar>
        <ListItemText
          primary={email.subject}
          secondary={
            <React.Fragment>
              <Typography
                sx={{ display: 'inline' }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {email.from.name}
              </Typography>
              {" — "}{email.preview}
            </React.Fragment>
          }
        />
      </ListItem>
      {index < emails.length - 1 && <Divider variant="inset" component="li" />}
    </React.Fragment>
  ))}
</List>
```

### 4. Dialog (Compose Modal)

```tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

<Dialog
  open={open}
  onClose={handleClose}
  fullWidth
  maxWidth="md"
  fullScreen={isMobile}  // Full screen su mobile
>
  <DialogTitle>Compose Email</DialogTitle>
  <DialogContent dividers>
    <TextField
      autoFocus
      margin="dense"
      label="To"
      type="email"
      fullWidth
      variant="outlined"
      sx={{ mb: 2 }}
    />
    <TextField
      margin="dense"
      label="Subject"
      fullWidth
      variant="outlined"
      sx={{ mb: 2 }}
    />
    <TextField
      margin="dense"
      label="Message"
      fullWidth
      multiline
      rows={8}
      variant="outlined"
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleSend} variant="contained">Send</Button>
  </DialogActions>
</Dialog>
```

### 5. Snackbar (Feedback)

**Sostituisce alert statici con toast temporanei:**

```tsx
import { Snackbar, Alert } from '@mui/material';

<Snackbar
  open={open}
  autoHideDuration={6000}
  onClose={handleClose}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
>
  <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
    Email sent successfully!
  </Alert>
</Snackbar>
```

---

## 🎬 Animazioni e Transizioni

### Material Motion Easing

```typescript
const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Ingresso/Uscita
  deceleration: 'cubic-bezier(0.0, 0, 0.2, 1)',  // Ingresso
  acceleration: 'cubic-bezier(0.4, 0, 1, 1)',    // Uscita
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',         // Transizioni rapide
};
```

### Durate Standard

```typescript
const duration = {
  shortest: 150,   // Tooltip, icone
  shorter: 200,    // Hover, focus
  short: 250,      // Drawer, dialog
  standard: 300,   // Transizioni principali
  complex: 375,    // Animazioni complesse
  enteringScreen: 225,
  leavingScreen: 195,
};
```

### Esempio: Card Hover Animation

```tsx
<Card
  sx={{
    transition: theme.transitions.create(
      ['box-shadow', 'transform'],
      {
        duration: theme.transitions.duration.shorter,
        easing: theme.transitions.easing.easeInOut,
      }
    ),
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'translateY(-4px)',
    },
  }}
>
```

### Esempio: Drawer Slide Animation

```tsx
<Drawer
  open={open}
  transitionDuration={{
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen,
  }}
  SlideProps={{
    easing: {
      enter: theme.transitions.easing.easeOut,
      exit: theme.transitions.easing.sharp,
    },
  }}
>
```

---

## ♿ Accessibilità

### WCAG 2.1 Level AA Compliance

#### 1. Contrasti Colori

**Tutti i testi devono rispettare:**
- Testo normale (< 18pt): **4.5:1**
- Testo grande (≥ 18pt): **3:1**
- Elementi UI: **3:1**

**Strumento verifica:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

#### 2. Navigazione Keyboard

**Focus indicators visibili:**

```tsx
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});
```

**Tab order logico:**
- AppBar → Drawer → Main Content → Bottom Navigation

#### 3. ARIA Labels

**Tutti gli elementi interattivi devono avere label:**

```tsx
<IconButton aria-label="delete email" onClick={handleDelete}>
  <Trash2 />
</IconButton>

<TextField
  label="Email subject"
  inputProps={{
    'aria-describedby': 'subject-helper-text',
  }}
/>
<FormHelperText id="subject-helper-text">
  Enter a brief subject line
</FormHelperText>
```

#### 4. Screen Reader Support

**Live regions per feedback dinamico:**

```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {loadingEmails ? 'Loading emails...' : `${emails.length} emails loaded`}
</div>
```

#### 5. Touch Targets

**Minimo 48x48px (WCAG AAA):**

```tsx
<IconButton
  sx={{
    width: 48,
    height: 48,
    '@media (pointer: coarse)': {  // Touch devices
      width: 56,
      height: 56,
    },
  }}
>
  <Mail />
</IconButton>
```

#### 6. Reduced Motion

**Rispetta preferenze utente:**

```tsx
const theme = createTheme({
  transitions: {
    create: (props, options) => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'none'
        : createTransition(props, options);
    },
  },
});
```

---

## 🛠️ Piano di Implementazione

### Fase 1: Setup e Configurazione (Giorno 1-2)

#### 1.1 Installazione Dipendenze

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @fontsource/roboto  # Font Roboto
```

#### 1.2 Configurazione Tema Globale

**File: `frontend/lib/theme/material-theme.ts`**

```typescript
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3F51B5',
      light: '#5C6BC0',
      dark: '#303F9F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFC107',
      light: '#FFCA28',
      dark: '#FFA000',
      contrastText: '#000000',
    },
    error: {
      main: '#F44336',
    },
    success: {
      main: '#4CAF50',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.60)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 400,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',  // Rimuove UPPERCASE default
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...lightTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#5C6BC0',
      light: '#7986CB',
      dark: '#3949AB',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.60)',
      disabled: 'rgba(255, 255, 255, 0.38)',
    },
  },
});
```

#### 1.3 Integrazione in `_app.tsx`

```tsx
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { lightTheme, darkTheme } from '@/lib/theme/material-theme';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function MaterialThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const muiTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system">
      <MaterialThemeWrapper>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </MaterialThemeWrapper>
    </NextThemeProvider>
  );
}
```

---

### Fase 2: Migrazione Layout e Navigazione (Giorno 3-4)

#### 2.1 Nuovo DashboardLayout Material

**File: `frontend/components/dashboard/MaterialDashboardLayout.tsx`**

```tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Mail,
  Sparkles,
  ServerCog,
  Settings,
  LogOut,
} from 'lucide-react';

const drawerWidth = 240;

const navItems = [
  { path: '/dashboard/index', label: 'AI Copilot', icon: Sparkles },
  { path: '/dashboard/email', label: 'Inbox', icon: Mail },
  { path: '/dashboard/providers', label: 'Providers', icon: ServerCog },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface MaterialDashboardLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function MaterialDashboardLayout({
  children,
  onLogout
}: MaterialDashboardLayoutProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileDrawerOpen(false);
  };

  const drawerContent = (
    <Box>
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={router.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              borderRadius: 2,
              mx: 1,
              my: 0.5,
            }}
          >
            <ListItemIcon>
              <item.icon size={20} />
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={4}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={24} />
            <Typography variant="h6" noWrap component="div">
              MailAgent
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton onClick={onLogout} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <LogOut size={20} />
          </IconButton>

          <IconButton edge="end">
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileDrawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          mb: { xs: 8, md: 0 },
        }}
      >
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>

      {/* Mobile Bottom Navigation */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: { md: 'none' },
        }}
        elevation={8}
      >
        <BottomNavigation
          value={router.pathname}
          onChange={(event, newValue) => handleNavigation(newValue)}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={<item.icon size={20} />}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
```

---

### Fase 3: Componenti Email (Giorno 5-7)

#### 3.1 EmailList Component Material

**File: `frontend/components/dashboard/material/EmailListMaterial.tsx`**

```tsx
import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Divider,
  Box,
  Paper,
} from '@mui/material';
import { Mail } from 'lucide-react';
import { Email } from '@/lib/api/email';

interface EmailListMaterialProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailClick: (email: Email) => void;
}

export function EmailListMaterial({
  emails,
  selectedEmailId,
  onEmailClick
}: EmailListMaterialProps) {
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
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: email.read ? 'grey.400' : 'primary.main' }}>
                  <Mail size={20} />
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
                      }}
                    >
                      {email.subject || '(No subject)'}
                    </Typography>
                    {!email.read && (
                      <Chip label="New" color="primary" size="small" />
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
                      {email.preview || email.textContent?.substring(0, 100)}
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

#### 3.2 EmailView Component Material

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
import { Reply, Forward, Trash2, Archive, Star } from 'lucide-react';
import { Email } from '@/lib/api/email';

interface EmailViewMaterialProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
}

export function EmailViewMaterial({
  email,
  onReply,
  onForward,
  onDelete
}: EmailViewMaterialProps) {
  return (
    <Paper elevation={1} sx={{ borderRadius: 2, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          {email.from.name?.[0] || email.from.email[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {email.subject}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            From: <strong>{email.from.name || email.from.email}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(email.receivedAt).toLocaleString()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton aria-label="star email">
            <Star size={20} />
          </IconButton>
          <IconButton aria-label="archive email">
            <Archive size={20} />
          </IconButton>
          <IconButton aria-label="delete email" onClick={onDelete}>
            <Trash2 size={20} />
          </IconButton>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Body */}
      <Typography
        variant="body1"
        component="div"
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        {email.textContent || email.htmlContent}
      </Typography>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Attachments ({email.attachments.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {email.attachments.map((attachment, index) => (
              <Chip
                key={index}
                label={attachment.filename}
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Actions */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<Reply />}
          onClick={onReply}
        >
          Reply
        </Button>
        <Button
          variant="outlined"
          startIcon={<Forward />}
          onClick={onForward}
        >
          Forward
        </Button>
      </Stack>
    </Paper>
  );
}
```

---

### Fase 4: Testing e Refinement (Giorno 8-10)

#### 4.1 Testing Accessibilità

**Strumenti:**
1. **Lighthouse Audit** (Chrome DevTools)
   - Target: Score ≥ 90 su Accessibility
2. **axe DevTools** (Extension Chrome)
3. **Keyboard Navigation Testing**
   - Tab order logico
   - Escape per chiudere modali
   - Arrow keys per liste

#### 4.2 Testing Responsive

**Breakpoints da testare:**
- 360px (Galaxy S8)
- 375px (iPhone SE)
- 414px (iPhone Plus)
- 768px (iPad)
- 1024px (Desktop)
- 1440px (Large Desktop)

#### 4.3 Performance Optimization

```bash
# Bundle size analysis
npm run build
npm install -D @next/bundle-analyzer

# Check for:
# - MUI tree-shaking
# - Icon bundle size (use dynamic imports)
# - Image optimization (Next.js Image)
```

**Target Metrics:**
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

---

## 📚 Risorse e Riferimenti

### Design Guidelines
- [Material Design 3](https://m3.material.io/)
- [Material Design Components](https://m3.material.io/components)
- [Material Design Color Tool](https://material.io/resources/color/)

### Librerie
- [Material UI Docs](https://mui.com/material-ui/getting-started/)
- [Material UI Examples](https://mui.com/material-ui/getting-started/templates/)

### Accessibilità
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

### Icone
- [Material Icons](https://mui.com/material-ui/material-icons/)
- [Lucide Icons](https://lucide.dev/) (current usage - compatible)

---

## ✅ Checklist Finale

Prima del deploy in produzione:

- [ ] Tutte le pagine utilizzano Material UI components
- [ ] Palette colori rispetta contrasti WCAG 2.1 AA
- [ ] Light/Dark mode funzionanti
- [ ] Navigazione keyboard completa
- [ ] Touch targets ≥ 48px
- [ ] ARIA labels su tutti gli elementi interattivi
- [ ] Focus indicators visibili
- [ ] Responsive testato su 6+ breakpoints
- [ ] Performance Lighthouse ≥ 90
- [ ] Bundle size ottimizzato (tree-shaking verificato)
- [ ] Animazioni rispettano `prefers-reduced-motion`
- [ ] Email list virtualizzata (se > 100 items)

---

## 🚀 Next Steps

Dopo il redesign:

1. **Micro-interazioni**: Aggiungere skeleton loaders per stati di caricamento
2. **Personalizzazione**: Implementare Material You dynamic color theming
3. **PWA**: Trasformare l'app in Progressive Web App
4. **Offline Mode**: Service workers per cache email
5. **Analytics**: Tracking UX con heatmaps (Hotjar/Clarity)

---

**Documento creato per MailAgent - Material Design 3 Redesign**
Versione 1.0 - 2025
