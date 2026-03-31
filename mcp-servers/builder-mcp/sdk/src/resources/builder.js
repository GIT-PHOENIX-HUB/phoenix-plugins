class BuilderResource {
  constructor(tools) {
    this.tools = tools;
  }

  provisionUser(params) {
    return this._invoke('provisionUser', params, { requireAuth: true, scopes: ['builder.users.write'] });
  }

  runPermissionAudit(params) {
    return this._invoke('runPermissionAudit', params, { requireAuth: true, scopes: ['builder.audit.read'] });
  }

  _invoke(name, params, options) {
    if (!this.tools) {
      throw new Error('BuilderResource requires ToolsResource instance');
    }

    return this.tools.invoke(name, params, options);
  }
}

module.exports = {
  BuilderResource
};
