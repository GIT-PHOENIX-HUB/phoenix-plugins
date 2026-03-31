class QuotesResource {
  constructor(http) {
    this.http = http;
  }

  createDraft(payload) {
    if (!payload || !payload.jobId) {
      throw new Error('createDraft requires jobId and items');
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('createDraft requires at least one line item');
    }

    return this.http.request({
      method: 'POST',
      url: '/api/quotes/draft',
      data: payload,
      requireAuth: true,
      scopes: ['st.write']
    });
  }
}

module.exports = {
  QuotesResource
};
