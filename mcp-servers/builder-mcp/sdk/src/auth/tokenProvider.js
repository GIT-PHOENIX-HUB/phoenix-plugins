const DEFAULT_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

class TokenProvider {
  constructor(options = {}) {
    if (typeof options.getToken !== 'function') {
      throw new Error('TokenProvider requires a getToken function');
    }

    this.getTokenFn = options.getToken;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cachedToken = null;
    this.cachedAt = 0;
  }

  async getToken(context = {}) {
    if (this.cacheTtlMs > 0 && this.cachedToken && Date.now() - this.cachedAt < this.cacheTtlMs) {
      return this.cachedToken;
    }

    const result = await this.getTokenFn(context);
    if (!result) {
      throw new Error('TokenProvider getToken() returned an empty value');
    }

    this.cachedToken = typeof result === 'string' ? result : result.token;
    this.cachedAt = Date.now();

    return this.cachedToken;
  }
}

class StaticTokenProvider extends TokenProvider {
  constructor(token) {
    super({
      getToken: async () => token,
      cacheTtlMs: Infinity
    });
  }
}

class EnvTokenProvider extends TokenProvider {
  constructor(envVar = 'PHOENIX_OAUTH_TOKEN', env = process.env) {
    super({
      getToken: async () => env[envVar]
    });
  }
}

module.exports = {
  TokenProvider,
  StaticTokenProvider,
  EnvTokenProvider
};
