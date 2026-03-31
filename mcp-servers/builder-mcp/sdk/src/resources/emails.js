class EmailsResource {
  constructor(http) {
    this.http = http;
  }

  getUnreadSummary(params = {}) {
    return this.http.request({
      url: '/api/emails/unread-summary',
      params
    });
  }

  createDraft(payload) {
    if (!payload || !payload.body) {
      throw new Error('createDraft requires body content');
    }

    return this.http.request({
      method: 'POST',
      url: '/api/emails/draft',
      data: payload,
      requireAuth: true,
      scopes: ['graph.mail.draft']
    });
  }
}

module.exports = {
  EmailsResource
};
