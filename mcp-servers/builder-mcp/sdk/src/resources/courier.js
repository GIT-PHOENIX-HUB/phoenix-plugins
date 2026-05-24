class CourierResource {
  constructor(tools) {
    this.tools = tools;
  }

  runEmailTriage(params) {
    return this._invoke('runEmailTriage', params, { requireAuth: true, scopes: ['courier.run'] });
  }

  getTriageSummary(params) {
    return this._invoke('getTriageSummary', params, { requireAuth: false });
  }

  _invoke(name, params, options) {
    if (!this.tools) {
      throw new Error('CourierResource requires ToolsResource instance');
    }

    return this.tools.invoke(name, params, options);
  }
}

module.exports = {
  CourierResource
};
