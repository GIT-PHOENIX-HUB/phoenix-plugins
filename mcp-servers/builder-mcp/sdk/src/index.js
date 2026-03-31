const { PhoenixClient } = require('./phoenixClient');
const { HttpClient } = require('./httpClient');
const { PhoenixSDKError } = require('./errors');
const { TokenProvider, StaticTokenProvider, EnvTokenProvider } = require('./auth/tokenProvider');

/**
 * Thin alias so downstream apps can instantiate `new PhoenixSDK()` and call the
 * scoped helpers (jobs, customers, emails, etc.).
 */
class PhoenixSDK extends PhoenixClient {
  constructor(options = {}) {
    super(options);
  }

  static fromEnvironment(env = process.env) {
    if (!env.PHOENIX_BASE_URL) {
      throw new PhoenixSDKError('PHOENIX_BASE_URL is required to bootstrap PhoenixSDK');
    }

    const token = env.PHOENIX_OAUTH_TOKEN;
    const tokenProvider = token ? new StaticTokenProvider(token) : undefined;

    return new PhoenixSDK({
      baseUrl: env.PHOENIX_BASE_URL,
      apiKey: env.PHOENIX_API_KEY,
      tokenProvider
    });
  }
}

module.exports = {
  PhoenixSDK,
  PhoenixClient,
  HttpClient,
  PhoenixSDKError,
  TokenProvider,
  StaticTokenProvider,
  EnvTokenProvider
};
