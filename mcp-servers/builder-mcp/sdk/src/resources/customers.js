class CustomersResource {
  constructor(http, tools) {
    this.http = http;
    this.tools = tools;
  }

  getById(customerId) {
    if (!customerId) {
      throw new Error('customerId is required');
    }

    return this.http.request({
      url: `/api/customers/${customerId}`
    });
  }

  search(params) {
    return this._invokeTool('searchCustomers', params);
  }

  getDetails(params) {
    return this._invokeTool('getCustomerDetails', params);
  }

  _invokeTool(name, params) {
    if (!this.tools) {
      throw new Error('CustomersResource requires ToolsResource instance to invoke MCP tools');
    }

    return this.tools.invoke(name, params);
  }
}

module.exports = {
  CustomersResource
};
