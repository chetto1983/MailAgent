# MailAgent - Project Guidelines

## 📋 Coding Standards

### 🌍 Internationalization (i18n) Policy

**MANDATORY**: All new components MUST use the translation system.

#### Implementation Requirements

When creating any new component:

1. **Import the translation hook**
   ```typescript
   import { useTranslations } from '@/lib/hooks/use-translations';
   ```

2. **Initialize translations in the component**
   ```typescript
   const t = useTranslations();
   const sectionCopy = t.dashboard.[yourSection];
   ```

3. **Use translations for all user-facing text**
   ```typescript
   // ❌ WRONG - Hardcoded strings
   <Button>Click me</Button>

   // ✅ CORRECT - Using translations
   <Button>{sectionCopy.buttonText}</Button>
   ```

4. **Add translations to both languages**
   - File: `frontend/locales/app-translations.ts`
   - Add entries for both English and Italian
   - Structure: `dashboard.[section].[key]`

5. **Update TypeScript definitions**
   - File: `frontend/locales/index.ts`
   - Add type definitions for all new translation keys
   - Ensures type safety and autocomplete

#### Supported Languages
- English (en)
- Italian (it)

#### Translation Files
- **Translations**: `frontend/locales/app-translations.ts`
- **Type Definitions**: `frontend/locales/index.ts`
- **Hook**: `frontend/lib/hooks/use-translations.ts`

#### Example: Creating a New Component

```typescript
import React from 'react';
import { Button } from '@mui/material';
import { useTranslations } from '@/lib/hooks/use-translations';

export function MyNewComponent() {
  const t = useTranslations();
  const copy = t.dashboard.mySection;

  return (
    <div>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
      <Button>{copy.actionButton}</Button>
    </div>
  );
}
```

#### Adding Translations

**In `app-translations.ts`:**
```typescript
// English
dashboard: {
  mySection: {
    title: 'My Title',
    description: 'My description text',
    actionButton: 'Click Here',
  }
}

// Italian
dashboard: {
  mySection: {
    title: 'Il Mio Titolo',
    description: 'Il mio testo descrittivo',
    actionButton: 'Clicca Qui',
  }
}
```

**In `index.ts`:**
```typescript
mySection: {
  title: string;
  description: string;
  actionButton: string;
};
```

---

## 🔍 Why This Matters

- **User Experience**: Users can switch between languages seamlessly
- **Scalability**: Easy to add new languages in the future
- **Consistency**: All UI text in one centralized location
- **Type Safety**: TypeScript ensures all translation keys exist
- **Maintainability**: Changes to text don't require searching through components

---

**Last Updated**: 2025-01-22
**Enforced By**: Claude Code AI Assistant
