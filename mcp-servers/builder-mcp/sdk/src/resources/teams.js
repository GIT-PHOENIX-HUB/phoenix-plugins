class TeamsResource {
  constructor(http) {
    this.http = http;
  }

  postMessage(payload) {
    if (!payload || !payload.message) {
      throw new Error('postMessage requires message text');
    }

    return this.http.request({
      method: 'POST',
      url: '/api/teams/post',
      data: payload,
      requireAuth: true,
      scopes: ['graph.teams.post']
    });
  }
}

module.exports = {
  TeamsResource
};
