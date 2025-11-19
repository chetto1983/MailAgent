# DUPLICATION EVIDENCE - SIDE BY SIDE COMPARISON

## Evidence 1: getProviderWithTokens() Method - CRITICAL DUPLICATION

### Google OAuth Service (Lines 191-238)
```typescript
private async getProviderWithTokens(tenantId: string, providerId: string) {
  const provider = await this.prisma.providerConfig.findFirst({
    where: { id: providerId, tenantId },
  });

  if (!provider) {
    throw new UnauthorizedException('Provider not found');
  }

  // Decrypt access token
  let accessToken = this.cryptoService.decrypt(
    provider.accessToken!,
    provider.tokenEncryptionIv!,
  );

  const needsRefresh =
    !provider.tokenExpiresAt ||
    provider.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

  if (needsRefresh && provider.refreshToken && provider.refreshTokenEncryptionIv) {
    try {
      const refreshToken = this.cryptoService.decrypt(
        provider.refreshToken,
        provider.refreshTokenEncryptionIv,
      );

      const refreshed = await this.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;

      const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);

      await this.prisma.providerConfig.update({
        where: { id: provider.id },
        data: {
          accessToken: encryptedAccess.encrypted,
          tokenEncryptionIv: encryptedAccess.iv,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to refresh Google access token for provider ${provider.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return { provider, accessToken };
}
```

**47 lines of code**

### Microsoft OAuth Service (Lines 430-520)
```typescript
private async getProviderWithTokens(tenantId: string, providerId: string) {
  const provider = await this.prisma.providerConfig.findFirst({
    where: { id: providerId, tenantId },
  });

  if (!provider) {
    throw new UnauthorizedException('Provider not found');
  }

  this.logger.debug(`Token expires at: ${provider.tokenExpiresAt}`);
  this.logger.debug(`Current time: ${new Date()}`);

  // Decrypt access token
  let accessToken = this.cryptoService.decrypt(
    provider.accessToken!,
    provider.tokenEncryptionIv!,
  );

  this.logger.debug(`Decrypted access token length: ${accessToken.length}`);

  // Validate decrypted token
  if (!this.validateJWT(accessToken, 'access token')) {
    this.logger.error('Decrypted access token is not a valid JWT. Provider needs re-authentication.');
    throw new UnauthorizedException('Invalid token format. Please reconnect this provider.');
  }

  const needsRefresh =
    !provider.tokenExpiresAt ||
    provider.tokenExpiresAt.getTime() <= Date.now() + 60 * 1000;

  this.logger.debug(`Needs refresh: ${needsRefresh}`);

  if (needsRefresh && provider.refreshToken && provider.refreshTokenEncryptionIv) {
    this.logger.log(`Attempting to refresh Microsoft token for provider ${provider.id}...`);

    try {
      let refreshToken = this.cryptoService.decrypt(
        provider.refreshToken,
        provider.refreshTokenEncryptionIv,
      );

      this.logger.debug(`Decrypted refresh token length: ${refreshToken.length}`);

      const refreshed = await this.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;

      this.logger.log(`✅ Token refreshed successfully, new expiry: ${refreshed.expiresAt}`);

      // Validate new token before saving
      if (!this.validateJWT(accessToken, 'refreshed access token')) {
        throw new Error('Refreshed token is not a valid JWT');
      }

      const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);
      const updateData: any = {
        accessToken: encryptedAccess.encrypted,
        tokenEncryptionIv: encryptedAccess.iv,
        tokenExpiresAt: refreshed.expiresAt,
      };

      if (refreshed.refreshToken && refreshed.refreshToken.length >= 10) {
        this.logger.log('Microsoft issued a new refresh token. Updating stored credentials.');
        refreshToken = refreshed.refreshToken;
        const encryptedRefresh = this.cryptoService.encrypt(refreshToken);
        updateData.refreshToken = encryptedRefresh.encrypted;
        updateData.refreshTokenEncryptionIv = encryptedRefresh.iv;
      } else {
        this.logger.debug('No new refresh token provided during refresh operation.');
      }

      await this.prisma.providerConfig.update({
        where: { id: provider.id },
        data: updateData,
      });

      this.logger.log(`Token saved to database successfully`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to refresh Microsoft access token for provider ${provider.id}: ${error instanceof Error ? error.message : error}`,
      );
      this.logger.error('Stack trace:', error instanceof Error ? error.stack : '');

      // Re-throw to propagate the error up
      throw new UnauthorizedException(
        'Failed to refresh access token. Please reconnect this provider.'
      );
    }
  }

  return { provider, accessToken };
}
```

**91 lines of code (including extra logging)**

### ANALYSIS
- **Core Logic**: 95% identical
- **Difference**: Microsoft adds JWT validation and more logging
- **Duplicated Code**: 47 lines of business logic
- **Solution**: Extract to BaseOAuthService, let subclasses override for provider-specific validation

---

## Evidence 2: Token Encryption Pattern - MEDIUM DUPLICATION

### Location 1: GoogleOAuthService (Lines 220-229)
```typescript
const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);

await this.prisma.providerConfig.update({
  where: { id: provider.id },
  data: {
    accessToken: encryptedAccess.encrypted,
    tokenEncryptionIv: encryptedAccess.iv,
    tokenExpiresAt: refreshed.expiresAt,
  },
});
```

### Location 2: MicrosoftOAuthService (Lines 483-495)
```typescript
const encryptedAccess = this.cryptoService.encrypt(refreshed.accessToken);
const updateData: any = {
  accessToken: encryptedAccess.encrypted,
  tokenEncryptionIv: encryptedAccess.iv,
  tokenExpiresAt: refreshed.expiresAt,
};

if (refreshed.refreshToken && refreshed.refreshToken.length >= 10) {
  this.logger.log('Microsoft issued a new refresh token. Updating stored credentials.');
  refreshToken = refreshed.refreshToken;
  const encryptedRefresh = this.cryptoService.encrypt(refreshToken);
  updateData.refreshToken = encryptedRefresh.encrypted;
  updateData.refreshTokenEncryptionIv = encryptedRefresh.iv;
}

await this.prisma.providerConfig.update({
  where: { id: provider.id },
  data: updateData,
});
```

### Location 3: ProviderConfigService.connectGoogleProvider (Lines 150-151)
```typescript
const encryptedAccessToken = this.crypto.encrypt(tokenData.accessToken);
const encryptedRefreshToken = this.crypto.encrypt(tokenData.refreshToken);
```

### Location 4: ProviderConfigService.connectMicrosoftProvider (Lines 225-226)
```typescript
const encryptedAccessToken = this.crypto.encrypt(tokenData.accessToken);
const encryptedRefreshToken = this.crypto.encrypt(tokenData.refreshToken);
```

### ANALYSIS
- **Pattern appears**: 4 times in codebase
- **Variations**: Some save immediately, some build updateData first
- **Opportunity**: Extract to TokenEncryptionService
- **Potential savings**: 30+ lines

---

## Evidence 3: generateRandomState() - EXACT DUPLICATE

### GoogleOAuthService (Lines 184-186)
```typescript
private generateRandomState(): string {
  return randomBytes(16).toString('hex');
}
```

### MicrosoftOAuthService (Lines 398-401)
```typescript
private generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
```

### ANALYSIS
- **Same functionality, different implementations**
- **Google**: Uses crypto.randomBytes (better)
- **Microsoft**: Uses Math.random (weaker)
- **Recommendation**: Use Google's approach, move to BaseOAuthService
- **Risk**: Microsoft's approach is cryptographically weaker

---

## Evidence 4: Error Handling Duplication

### GoogleOAuthService - exchangeCodeForTokens() Error Handling
```typescript
} catch (error) {
  this.logger.error('Failed to exchange authorization code:', error);
  throw new UnauthorizedException('Invalid authorization code');
}
```

### MicrosoftOAuthService - exchangeCodeForTokens() Error Handling
```typescript
} catch (error) {
  this.logger.error('Failed to exchange authorization code:', error);

  // Log detailed error information
  if (error && typeof error === 'object') {
    this.logger.error('Error details:', JSON.stringify(error, null, 2));
    if ('errorCode' in error) {
      this.logger.error(`MSAL Error Code: ${(error as any).errorCode}`);
    }
    if ('errorMessage' in error) {
      this.logger.error(`MSAL Error Message: ${(error as any).errorMessage}`);
    }
  }

  throw new UnauthorizedException('Invalid authorization code');
}
```

### ANALYSIS
- **Core pattern**: Catch error, log, throw UnauthorizedException
- **Microsoft**: More verbose error logging
- **Opportunity**: Create error handling helper in BaseOAuthService
- **Issue**: Not using typed errors from email-provider.interface

---

## SUMMARY OF DUPLICATIONS

| Pattern | Google | Microsoft | Provider Config | Total | Refactor Target |
|---------|--------|-----------|-----------------|-------|-----------------|
| getProviderWithTokens() | ✓ | ✓ | - | 2x | BaseOAuthService |
| Token encryption | ✓ | ✓ | ✓✓ | 4x | TokenEncryptionService |
| generateRandomState() | ✓ | ✓ | - | 2x | BaseOAuthService |
| Error handling | ✓ | ✓ | - | 2x | BaseOAuthService |
| Test methods | ✓ | ✓ | - | 2x | Shared utilities |
| Token refresh | ✓ | ✓ | - | 2x | BaseOAuthService |

---

## TOTAL DUPLICATION IMPACT

- **Total duplicated lines**: ~300 (7% of 4,420)
- **Lines that could be eliminated**: ~150-180
- **Services affected**: 3 (Google OAuth, Microsoft OAuth, Provider Config)
- **Reduction potential**: 50-60% of identified duplication

## REFACTORING PRIORITY

### P0 (Do First) - Highest Impact
1. **BaseOAuthService** - Eliminates 100+ lines, fixes inconsistency
2. **TokenEncryptionService** - Eliminates 30+ lines, centralizes logic

### P1 (Do Second) - Medium Impact
3. **Error handling consolidation** - Improves consistency
4. **Test utilities extraction** - Reduces test duplication

### P2 (Do Third) - Lower Impact
5. **Configuration validation** - Minor duplication
6. **Type conversions** - Scattered, low impact

