class FinanceResource {
  constructor(tools) {
    this.tools = tools;
  }

  getAPAgingSummary(params) {
    return this._invoke('getAPAgingSummary', params, { requireAuth: true, scopes: ['finance.read'] });
  }

  getARAgingSummary(params) {
    return this._invoke('getARAgingSummary', params, { requireAuth: true, scopes: ['finance.read'] });
  }

  _invoke(name, params, options) {
    if (!this.tools) {
      throw new Error('FinanceResource requires ToolsResource instance');
    }

    return this.tools.invoke(name, params, options);
  }
}

module.exports = {
  FinanceResource
};
