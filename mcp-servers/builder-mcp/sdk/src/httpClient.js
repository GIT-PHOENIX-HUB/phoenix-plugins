const axios = require('axios');
const crypto = require('crypto');
const { PhoenixSDKError } = require('./errors');

/**
 * Minimal HTTP client wrapper that centralizes auth headers and error handling
 * for Phoenix SDK consumers.
 */
class HttpClient {
  constructor(options = {}) {
    if (!options.baseUrl) {
      throw new Error('Phoenix SDK requires a baseUrl');
    }

    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.tokenProvider = options.tokenProvider;
    this.getAccessToken = options.getAccessToken;
    this.defaultHeaders = options.defaultHeaders || {};
    this.timeout = options.timeout || 10000;
    this.userAgent = options.userAgent || 'PhoenixSDK/0.1.0';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout
    });
  }

  async request(config = {}) {
    const headers = { ...this.defaultHeaders, ...(config.headers || {}) };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    headers['x-correlation-id'] = config.correlationId || this._generateCorrelationId();
    headers['User-Agent'] = headers['User-Agent'] || this.userAgent;

    if (config.requireAuth) {
      const token = await this._getAccessToken({ scopes: config.scopes });
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await this.client.request({
        method: config.method || 'GET',
        url: config.url,
        data: config.data,
        params: config.params,
        headers
      });

      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const payload = error.response?.data;
      throw new PhoenixSDKError(`Phoenix SDK request failed (${status || 'network'})`, {
        status,
        payload,
        requestId: headers['x-correlation-id']
      });
    }
  }

  async _getAccessToken(context) {
    if (this.tokenProvider?.getToken) {
      return this.tokenProvider.getToken(context);
    }

    if (typeof this.getAccessToken === 'function') {
      return this.getAccessToken(context);
    }

    throw new PhoenixSDKError('No OAuth token provider configured for Phoenix SDK requests that require auth');
  }

  _generateCorrelationId() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `phoenix-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

module.exports = {
  HttpClient
};
