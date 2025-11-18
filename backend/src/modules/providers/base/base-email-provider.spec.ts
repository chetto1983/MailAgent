import { BaseEmailProvider } from './base-email-provider';
import {
  TokenExpiredError,
  InsufficientPermissionsError,
  RateLimitError,
  ProviderError,
} from '../interfaces/email-provider.interface';

class TestProvider extends BaseEmailProvider {
  constructor() {
    super('test');
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.withErrorHandling('op', fn);
  }
}

describe('BaseEmailProvider.withErrorHandling', () => {
  const provider = new TestProvider();

  it('returns success result', async () => {
    await expect(provider.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('maps 401 to TokenExpiredError', async () => {
    await expect(
      provider.run(async () => {
        const err: any = new Error('unauthorized');
        err.response = { status: 401 };
        throw err;
      }),
    ).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it('maps 403 to InsufficientPermissionsError with scopes', async () => {
    await expect(
      provider.run(async () => {
        const err: any = new Error('forbidden');
        err.response = { status: 403, data: { error: { requiredScopes: ['mail.read'] } } };
        throw err;
      }),
    ).rejects.toBeInstanceOf(InsufficientPermissionsError);
  });

  it('maps 429 to RateLimitError with retryAfter header', async () => {
    await expect(
      provider.run(async () => {
        const err: any = new Error('rate limited');
        err.response = { status: 429, headers: { 'retry-after': '5' } };
        throw err;
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('wraps unknown errors into ProviderError', async () => {
    await expect(
      provider.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});
