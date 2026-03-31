class PhoenixSDKError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PhoenixSDKError';
    this.status = options.status;
    this.payload = options.payload;
    this.requestId = options.requestId;
  }
}

module.exports = {
  PhoenixSDKError
};
