# 🧪 TEST RESULTS: Token Refresh Mechanism

**Data test**: 29 Ottobre 2025, 17:30
**Versione**: 1.0.0
**Tester**: Claude Code Agent

---

## 📋 Obiettivo Test

Verificare il comportamento automatico del refresh dei token OAuth2 per provider Google e Microsoft quando i token access sono scaduti.

---

## 🔬 Setup Test

### Token Iniziali
| Provider | Email | Token Expires (originale) | Status |
|----------|-------|---------------------------|--------|
| Google | dvdmarchetto@gmail.com | 2025-10-29 16:48:24 | ⏰ Scaduto (~40 min) |
| Microsoft | chetto983@hotmail.it | 2025-10-29 16:48:44 | ⏰ Scaduto (~40 min) |

### Condizioni Test
- Ora test: ~17:28 (40 minuti dopo scadenza)
- Refresh token: Entrambi presenti nel database ✅
- Backend: Avviato con configurazione corretta
- JWT sessione utente: Valido

---

## ✅ Google Provider - SUCCESSO

### Test Eseguito
```bash
node test-google-apis.js "JWT_TOKEN"
```

### Risultati
| Test | Risultato | Dettagli |
|------|-----------|----------|
| Gmail Labels | ✅ PASS | 18 labels recuperate |
| Gmail Messages | ✅ PASS | 10 messaggi (include nuovo da TheFork) |
| Calendar List | ✅ PASS | 3 calendari |
| Calendar Events | ✅ PASS | 10 eventi futuri |
| Contacts | ✅ PASS | 10 contatti |

### Token Refresh
- **Token vecchio**: 16:48:24
- **Token nuovo**: **19:13:02.751** ← Refreshato con successo! ✅
- **Updated at**: 18:13:03.753
- **Differenza**: +2h 24min 38sec (nuovo token valido)

### Conclusione Google
✅ **FUNZIONANTE** - Il meccanismo di refresh automatico funziona perfettamente.

Il sistema ha:
1. Rilevato che il token era scaduto (60 secondi prima della scadenza)
2. Decriptato il refresh token dal database
3. Chiamato `refreshAccessToken()` con successo
4. Salvato il nuovo access token encrypted
5. Aggiornato `tokenExpiresAt` e `updatedAt`

---

## ❌ Microsoft Provider - FALLIMENTO

### Test Eseguito
```bash
node test-microsoft-apis.js "JWT_TOKEN"
```

### Risultati
| Test | Risultato | Dettagli |
|------|-----------|----------|
| Mail Folders | ⚠️ FAIL | 0 risultati (prima: 9 folders) |
| Mail Messages | ⚠️ FAIL | 0 risultati (prima: 10 messaggi) |
| Calendar List | ⚠️ FAIL | 0 risultati (prima: 5 calendari) |
| Calendar Events | ⚠️ FAIL | 0 risultati |
| Contacts | ⚠️ FAIL | 0 risultati (prima: 7 contatti) |

### Token Status
- **Token scadenza**: 16:48:44 (NON aggiornato!) ❌
- **Updated at**: 15:48:45.206 (data creazione originale)
- **Refresh token presente**: YES ✅
- **Refresh token IV presente**: YES ✅

### Errore Identificato

Chiamata diretta API Microsoft Graph:
```bash
curl http://localhost:3000/providers/cmhc67d3p0003u16ztm6mumps/test/mail-folders
```

**Errore restituito**:
```json
{
  "success": false,
  "error": "IDX14100: JWT is not well formed, there are no dots (.). The token needs to be in JWS or JWE Compact Serialization Format."
}
```

### Analisi Errore

**Problema**: Il token passato a Microsoft Graph API non è un JWT valido.

**Possibili cause**:

1. **Token decryptato corrotto**: Il processo di decrypt non restituisce un JWT valido
   - Token encrypted salvato: `7cdcc006b87e69ab...` (2976 caratteri)
   - Dopo decrypt: formato non-JWT

2. **Token originale invalido**: Il token salvato inizialmente non era un JWT
   - Microsoft MSAL non restituisce sempre un refresh token valido
   - Commento nel codice (riga 95-97):
     ```typescript
     // Microsoft MSAL doesn't always return refresh token in the response object
     // but it's stored internally. For explicit refresh token, we need to use different approach
     const refreshToken = (response as any).refreshToken || '';

     if (!refreshToken) {
       this.logger.warn('Refresh token not available in response...');
     }
     ```

3. **Refresh non tentato**: Il metodo `getProviderWithTokens()` potrebbe non essere chiamato
   - Verifica necessaria: controllare se il metodo viene eseguito prima delle chiamate API

### Database Status
```sql
 providerType |         email          | has_refresh_token | has_iv | token_expires_at
--------------+------------------------+-------------------+--------+-----------------
 microsoft    | chetto983@hotmail.it   | YES               | YES    | 2025-10-29 16:48:44
```

**Nota**: Refresh token E IV sono presenti, quindi il problema non è mancanza di refresh token.

### Conclusione Microsoft
❌ **NON FUNZIONANTE** - Il refresh automatico fallisce.

**Cause probabili** (in ordine di probabilità):
1. Token originale salvato non è un JWT valido (problema al momento della connessione iniziale)
2. Processo di decrypt produce output corrotto
3. Microsoft MSAL `acquireTokenByRefreshToken()` fallisce silenziosamente
4. Il metodo di refresh non viene chiamato prima delle API calls

---

## 🔍 Investigazione Approfondita

### Verifica Metodo MSAL
```bash
grep -r "acquireTokenByRefreshToken" node_modules/@azure/msal-node --include="*.d.ts"
```

**Risultato**: ✅ Il metodo esiste in MSAL
```typescript
acquireTokenByRefreshToken(request: RefreshTokenRequest): Promise<AuthenticationResult | null>;
```

### Confronto Token Size
| Provider | Token Length | Note |
|----------|--------------|------|
| Google | 512 caratteri | Dimensione normale per JWT Google |
| Microsoft | 2976 caratteri | Molto grande - potrebbe essere problema |

Token Microsoft è **5.8x più grande** del token Google. Questo potrebbe causare problemi con:
- Buffer size nella encrypt/decrypt
- Lunghezza massima campo database
- Parsing JWT

---

## 💡 Raccomandazioni

### Priorità ALTA 🔥

#### 1. Riconnettere Microsoft Provider
**Azione immediata**: Disconnetti e riconnetti Microsoft per ottenere un token valido.

```bash
# Frontend: Dashboard > Providers
1. Click "Disconnect" su Microsoft provider
2. Click "Connect Microsoft"
3. Completa OAuth flow
4. Verifica che il refresh token sia salvato
```

**Perché**: Il token attuale potrebbe essere corrotto dalla connessione iniziale.

---

#### 2. Aggiungere Logging Dettagliato

Modificare `microsoft-oauth.service.ts` per loggare:

```typescript
private async getProviderWithTokens(tenantId: string, providerId: string) {
  // ... existing code ...

  this.logger.debug(`Token expires at: ${provider.tokenExpiresAt}`);
  this.logger.debug(`Current time: ${new Date()}`);
  this.logger.debug(`Needs refresh: ${needsRefresh}`);

  if (needsRefresh && provider.refreshToken) {
    this.logger.log(`Attempting to refresh Microsoft token...`);
    try {
      const refreshToken = this.cryptoService.decrypt(...);
      this.logger.debug(`Decrypted refresh token length: ${refreshToken.length}`);

      const refreshed = await this.refreshAccessToken(refreshToken);
      this.logger.log(`✅ Token refreshed successfully, new expiry: ${refreshed.expiresAt}`);
    } catch (error) {
      this.logger.error(`❌ Token refresh failed: ${error.message}`, error.stack);
      throw error; // Re-throw per vedere l'errore
    }
  }

  // Decrypt access token
  const accessToken = this.cryptoService.decrypt(...);
  this.logger.debug(`Decrypted access token length: ${accessToken.length}`);
  this.logger.debug(`Access token starts with: ${accessToken.substring(0, 20)}...`);

  return { provider, accessToken };
}
```

---

#### 3. Verificare Formato Token Salvato

Aggiungere validazione JWT prima di salvare il token:

```typescript
async exchangeCodeForTokens(authorizationCode: string) {
  // ... existing code ...

  // Validate access token is a valid JWT
  const parts = response.accessToken.split('.');
  if (parts.length !== 3) {
    this.logger.error(`Invalid JWT format: ${parts.length} parts instead of 3`);
    throw new Error('Microsoft returned invalid JWT token');
  }

  this.logger.log(`Access token is valid JWT (${response.accessToken.length} chars)`);

  // Validate refresh token
  if (!refreshToken || refreshToken.length < 10) {
    this.logger.error('Refresh token is empty or too short');
    throw new Error('Failed to obtain refresh token from Microsoft');
  }

  return { accessToken, refreshToken, expiresAt, email };
}
```

---

### Priorità MEDIA ⚡

#### 4. Implementare Retry Logic

```typescript
async refreshAccessToken(refreshToken: string, retries: number = 3): Promise<...> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await this.msalClient.acquireTokenByRefreshToken({
        refreshToken,
        scopes: this.defaultScopes,
      });

      if (response?.accessToken) {
        return { accessToken: response.accessToken, expiresAt: response.expiresOn };
      }
    } catch (error) {
      this.logger.warn(`Refresh attempt ${i+1}/${retries} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('Failed to refresh token after retries');
}
```

---

#### 5. Test Decrypt Manuale

Creare endpoint di debug per testare decrypt:

```typescript
@Get(':id/debug/token')
async debugToken(@Param('id') id: string, @Request() req: any) {
  const { tenantId } = req.user;
  const provider = await this.prisma.providerConfig.findFirst({
    where: { id, tenantId }
  });

  try {
    const decrypted = this.cryptoService.decrypt(
      provider.accessToken,
      provider.tokenEncryptionIv
    );

    return {
      encrypted_length: provider.accessToken.length,
      decrypted_length: decrypted.length,
      decrypted_start: decrypted.substring(0, 50),
      is_jwt: decrypted.split('.').length === 3,
      jwt_parts: decrypted.split('.').map(p => p.length),
    };
  } catch (error) {
    return { error: error.message };
  }
}
```

---

### Priorità BASSA 💡

#### 6. Fallback a Re-autenticazione

Se refresh fallisce, guidare l'utente a riconnettersi:

```typescript
catch (error) {
  this.logger.error(`Token refresh failed: ${error.message}`);

  // Mark provider as requiring re-authentication
  await this.prisma.providerConfig.update({
    where: { id: provider.id },
    data: {
      isActive: false,
      metadata: { requiresReauth: true, lastError: error.message }
    }
  });

  throw new UnauthorizedException('Provider requires re-authentication');
}
```

Frontend può intercettare questo errore e mostrare banner "Reconnect Microsoft".

---

## 📊 Statistiche Test

| Metrica | Valore |
|---------|--------|
| **Test totali eseguiti** | 10 |
| **Test passati** | 5 (Google) |
| **Test falliti** | 5 (Microsoft) |
| **Success rate** | 50% |
| **Google success rate** | 100% ✅ |
| **Microsoft success rate** | 0% ❌ |

---

## 🎯 Azioni Immediate

### Per l'utente:

1. **Riconnetti Microsoft Provider** (5 minuti)
   - Dashboard > Providers
   - Disconnect Microsoft
   - Connect Microsoft
   - Riautentica

2. **Ri-testa Microsoft APIs** (2 minuti)
   ```bash
   node test-microsoft-apis.js "YOUR_JWT_TOKEN"
   ```

3. **Se ancora fallisce**: Aprire issue con log dettagliati

### Per lo sviluppatore:

1. **Aggiungi logging dettagliato** (15 minuti)
   - Implementare log nei punti chiave del refresh

2. **Aggiungi validazione JWT** (10 minuti)
   - Verificare formato token prima di salvare

3. **Test manuale decrypt** (5 minuti)
   - Creare endpoint debug per verificare decrypt

4. **Monitora log backend** durante prossimo test

---

## 🏁 Conclusione

### Google Provider: ✅ ECCELLENTE
Il meccanismo di refresh automatico funziona perfettamente. Token refreshati con successo dopo 40 minuti di scadenza, senza interruzioni del servizio.

### Microsoft Provider: ❌ CRITICO
Il refresh fallisce completamente. Token non viene aggiornato, risultando in errori JWT malformato. **Richiede riconnessione manuale dell'utente**.

**Root Cause Sospetta**: Token originale salvato durante connessione iniziale non era un JWT valido o è stato corrotto durante encrypt/decrypt.

**Impatto**: Utenti con Microsoft provider devono riconnettersi manualmente quando il token scade (~1 ora).

**Priorità Fix**: 🔥 ALTA - Feature critica per UX

---

**Report generato**: 29 Ottobre 2025, 18:30
**By**: Claude Code Agent
**Test Framework**: Manual E2E Testing
**Environment**: Development (localhost)

---

_Questo documento sarà aggiornato dopo ogni iterazione di fix e re-test._
