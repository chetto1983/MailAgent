# 🔧 OAuth Email Auto-Extraction Fix

**Data**: 30 Ottobre 2025
**Problema**: Popup manuale che richiede email dopo OAuth2 redirect
**Soluzione**: Email estratta automaticamente da OAuth2 token

---

## 🐛 Problema

Quando l'utente completava l'autenticazione OAuth2 con Google o Microsoft e tornava all'applicazione, appariva un popup `prompt()` deprecato che chiedeva di inserire manualmente l'email:

```
localhost:3001 dice
Enter the email address for your Google account:
[input field]
[Ok] [Annulla]
```

Questo è **deprecato** perché:
1. L'email è già disponibile nell'ID token OAuth2
2. È una user experience scadente (doppia verifica)
3. L'utente potrebbe inserire un'email sbagliata

---

## ✅ Soluzione Implementata

### 1. Backend: Email Opzionale nei DTO

**File modificati**:
- `backend/src/modules/providers/dto/google-provider.dto.ts`
- `backend/src/modules/providers/dto/microsoft-provider.dto.ts`

**Modifiche**:
```typescript
// PRIMA
export class ConnectGoogleProviderDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;  // Campo obbligatorio
  // ...
}

// DOPO
export class ConnectGoogleProviderDto {
  @IsEmail()
  @IsOptional()
  email?: string;  // Campo opzionale - estratto da OAuth2
  // ...
}
```

### 2. Backend: Utilizzo Email da OAuth2

**File modificato**: `backend/src/modules/providers/services/provider-config.service.ts`

**Google Provider**:
```typescript
async connectGoogleProvider(tenantId, userId, dto) {
  // Exchange authorization code for tokens
  const tokenData = await this.googleOAuth.exchangeCodeForTokens(dto.authorizationCode);

  // Use email from OAuth2 if not provided in DTO
  const email = dto.email || tokenData.email;  // ← FIX

  // If email was provided, verify it matches
  if (dto.email && tokenData.email !== dto.email) {
    throw new BadRequestException('Email mismatch');
  }

  // Save to database usando 'email' da OAuth2
  await this.prisma.providerConfig.upsert({
    where: {
      tenantId_email_providerType: {
        tenantId,
        email,  // ← Usa email da OAuth2
        providerType: 'google',
      },
    },
    // ...
  });
}
```

**Microsoft Provider**: Stessa logica applicata.

### 3. Frontend: Rimozione Prompt Manuale

**File modificato**: `frontend/pages/dashboard/providers.tsx`

**Codice rimosso**:
```typescript
// ❌ DEPRECATO - RIMOSSO
const email = prompt(
  `Enter the email address for your ${providerType} account:`,
);

if (!email) {
  setError('Email is required to complete the connection');
  return;
}
```

**Nuovo codice**:
```typescript
// ✅ Email ottenuta automaticamente da OAuth2
const handleOAuthCallback = async (authorizationCode, providerType) => {
  if (providerType === 'google') {
    await providersApi.connectGoogle({
      authorizationCode,         // Solo authorization code
      supportsCalendar: true,
      // email non più richiesta
    });
  }
  // ...
}
```

### 4. Frontend: TypeScript Types Aggiornati

**File modificato**: `frontend/lib/api/providers.ts`

```typescript
// PRIMA
export interface ConnectGoogleDto {
  email: string;  // Obbligatorio
  authorizationCode: string;
  // ...
}

// DOPO
export interface ConnectGoogleDto {
  email?: string;  // Opzionale
  authorizationCode: string;
  // ...
}
```

---

## 🔍 Come Funziona Ora

### Flow OAuth2 Completo

```
1. User clicca "Connect Google Account"
   ↓
2. Frontend → Backend: GET /providers/google/auth-url
   ← Backend restituisce authUrl
   ↓
3. Frontend redirect → Google OAuth2
   User fa login su Google
   ↓
4. Google redirect → Frontend con ?code=XXXX&provider=google
   ↓
5. Frontend → Backend: POST /providers/google/connect
   Body: { authorizationCode: "XXXX" }
   (NO email nel body!)
   ↓
6. Backend chiama Google OAuth2:
   - Exchange code for tokens
   - Ottiene access_token, refresh_token, id_token
   - Estrae email da id_token ✅
   ↓
7. Backend salva provider con email da OAuth2
   ↓
8. Frontend mostra "Successfully connected!"
```

### Estrazione Email da OAuth2

**Google**:
```typescript
// backend/src/modules/providers/services/google-oauth.service.ts
async exchangeCodeForTokens(authorizationCode: string) {
  const { tokens } = await this.oauth2Client.getToken(authorizationCode);

  // Get email from ID token
  const ticket = await this.oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: this.config.oauth.gmail.clientId,
  });
  const payload = ticket.getPayload();
  const email = payload?.email;  // ← Email estratta qui

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date),
    email,  // ← Ritornata al service
  };
}
```

**Microsoft**:
```typescript
// backend/src/modules/providers/services/microsoft-oauth.service.ts
async exchangeCodeForTokens(authorizationCode: string) {
  const response = await this.msalClient.acquireTokenByCode({
    code: authorizationCode,
    scopes: this.defaultScopes,
    redirectUri: this.config.oauth.microsoft.redirectUri,
  });

  const email = response.account?.username;  // ← Email estratta qui

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: new Date(Date.now() + (response.expiresOn?.getTime() || 3600000)),
    email,  // ← Ritornata al service
  };
}
```

---

## 🧪 Testing

### Test Case 1: Nuova Connessione Google

**Steps**:
1. Vai a http://localhost:3001/dashboard/providers
2. Click "Connect Google Account"
3. Fai login con Google
4. Google redirect a localhost:3001?code=XXX&provider=google

**Expected**:
- ✅ NO popup che chiede email
- ✅ Redirect automatico a /dashboard/providers
- ✅ Messaggio "Successfully connected google account!"
- ✅ Provider salvato in database con email corretta

**Verifica Database**:
```sql
SELECT email, "providerType", "createdAt"
FROM provider_configs
WHERE "providerType" = 'google'
ORDER BY "createdAt" DESC
LIMIT 1;
```

### Test Case 2: Nuova Connessione Microsoft

**Steps**:
1. Vai a http://localhost:3001/dashboard/providers
2. Click "Connect Microsoft Account"
3. Fai login con Microsoft
4. Microsoft redirect a localhost:3001?code=XXX&provider=microsoft

**Expected**:
- ✅ NO popup che chiede email
- ✅ Redirect automatico a /dashboard/providers
- ✅ Messaggio "Successfully connected microsoft account!"
- ✅ Provider salvato in database con email corretta

### Test Case 3: Riconnessione Account Esistente

**Steps**:
1. Disconnetti un provider esistente
2. Riconnettilo seguendo il flow OAuth2

**Expected**:
- ✅ Provider aggiornato (upsert) invece di creare duplicato
- ✅ Token refreshati
- ✅ Email rimane invariata

---

## 📊 Backwards Compatibility

Il fix è **backwards compatible**:

✅ **Se email viene fornita nel DTO** (vecchio comportamento):
   - Backend verifica che corrisponda all'email da OAuth2
   - Se match → Ok
   - Se mismatch → Error "Email mismatch"

✅ **Se email NON viene fornita nel DTO** (nuovo comportamento):
   - Backend usa automaticamente email da OAuth2
   - Nessun controllo necessario

Questo significa che **entrambi i comportamenti sono supportati** e non rompe codice esistente.

---

## 🔒 Security Considerations

### Vantaggi Sicurezza

1. **No User Input**: Email non manipolabile dall'utente
2. **OAuth2 Verified**: Email viene da provider OAuth2 verificato
3. **Consistency**: Email sempre corretta (da ID token firmato)

### Validazione

Il backend continua a:
- ✅ Validare formato email (`@IsEmail()`)
- ✅ Verificare che l'authorization code sia valido
- ✅ Verificare firma dell'ID token
- ✅ Controllare che email appartenga al provider corretto

---

## 📁 File Modificati

### Backend (4 file)

1. **`backend/src/modules/providers/dto/google-provider.dto.ts`**
   - Cambiato: `email!: string` → `email?: string`
   - Aggiunto: `@IsOptional()` decorator

2. **`backend/src/modules/providers/dto/microsoft-provider.dto.ts`**
   - Cambiato: `email!: string` → `email?: string`
   - Aggiunto: `@IsOptional()` decorator

3. **`backend/src/modules/providers/services/provider-config.service.ts`**
   - `connectGoogleProvider()`: Usa `dto.email || tokenData.email`
   - `connectMicrosoftProvider()`: Usa `dto.email || tokenData.email`

### Frontend (2 file)

4. **`frontend/pages/dashboard/providers.tsx`**
   - Rimosso: `prompt()` per chiedere email
   - Rimosso: Validazione email non presente
   - Semplificato: `handleOAuthCallback()`

5. **`frontend/lib/api/providers.ts`**
   - Cambiato: `email: string` → `email?: string`
   - Aggiunto: Commento "Optional - will be obtained from OAuth2"

### Build

- ✅ Backend compilato con successo
- ✅ Frontend TypeScript errori risolti

---

## ✅ Checklist Completamento

- [x] Backend DTO email opzionale (Google)
- [x] Backend DTO email opzionale (Microsoft)
- [x] Backend service usa OAuth2 email (Google)
- [x] Backend service usa OAuth2 email (Microsoft)
- [x] Frontend rimosso prompt email
- [x] Frontend TypeScript types aggiornati
- [x] Backend compilato con successo
- [x] Documentazione creata
- [ ] **Testing manuale OAuth2 Google** ← DA FARE
- [ ] **Testing manuale OAuth2 Microsoft** ← DA FARE

---

## 🎯 Next Steps

1. **Test Manuale**: Disconnetti e riconnetti provider Google/Microsoft
2. **Verifica**: No popup email appare
3. **Database Check**: Email salvata correttamente
4. **User Feedback**: UX migliorata (1 step in meno)

---

## 💡 User Benefits

| Prima | Dopo |
|-------|------|
| 1. Login OAuth2 | 1. Login OAuth2 |
| 2. Redirect to app | 2. Redirect to app |
| 3. **Popup: inserisci email** | 3. **✨ Auto-connected** |
| 4. Click OK | |
| 5. Connected | |

**Risultato**: UX più fluida, meno errori utente, processo più veloce! 🚀

---

**Status**: ✅ **FIX IMPLEMENTATO E COMPILATO**
**Testing**: ⏳ In attesa di test manuale
**Ready for**: Produzione dopo testing
