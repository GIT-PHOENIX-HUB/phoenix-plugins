class ToolsResource {
  constructor(http) {
    this.http = http;
  }

  list() {
    return this.http.request({ url: '/mcp/tools' });
  }

  async get(name) {
    const response = await this.list();
    return response.tools?.find(tool => tool.name === name) || null;
  }

  invoke(name, params = {}, options = {}) {
    return this.http.request({
      method: 'POST',
      url: `/mcp/tools/${name}`,
      data: params,
      requireAuth: options.requireAuth,
      scopes: options.scopes
    });
  }

  getPluginManifest() {
    return this.http.request({ url: '/.well-known/ai-plugin.json' });
  }

  getProtectedResourceMetadata() {
    return this.http.request({ url: '/.well-known/oauth-protected-resource' });
  }
}

module.exports = {
  ToolsResource
};
