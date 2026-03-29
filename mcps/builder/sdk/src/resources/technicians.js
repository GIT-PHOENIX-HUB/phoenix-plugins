class TechniciansResource {
  constructor(http) {
    this.http = http;
  }

  getOnCall(params = {}) {
    return this.http.request({
      url: '/api/technicians/on-call',
      params
    });
  }
}

module.exports = {
  TechniciansResource
};
