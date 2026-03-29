class JobsResource {
  constructor(http, tools) {
    this.http = http;
    this.tools = tools;
  }

  getDailySummary(params = {}) {
    return this.http.request({
      url: '/api/jobs/daily-summary',
      params
    });
  }

  getDetails(jobId) {
    if (!jobId) {
      throw new Error('jobId is required');
    }

    return this.http.request({
      url: `/api/jobs/${jobId}`
    });
  }

  getCapacityAvailability(params) {
    return this._invokeTool('getCapacityAvailability', params);
  }

  assignTechnician(payload) {
    if (!payload || !payload.jobId) {
      throw new Error('assignTechnician requires jobId');
    }

    return this.http.request({
      method: 'POST',
      url: '/api/jobs/assign-technician',
      data: payload,
      requireAuth: true,
      scopes: ['st.write']
    });
  }

  bookJob(payload) {
    return this._invokeTool('bookJob', payload, { requireAuth: true, scopes: ['st.write'] });
  }

  _invokeTool(name, params, options = {}) {
    if (!this.tools) {
      throw new Error('JobsResource requires ToolsResource instance to invoke MCP tools');
    }

    return this.tools.invoke(name, params, options);
  }
}

module.exports = {
  JobsResource
};
