const app = require('../../src/app');

/**
 * Creates in-memory mock request, response, and next callback for unit & middleware testing.
 * Completely network-independent (0 TCP sockets, 0 sandbox restrictions).
 */
function mockReqRes(options = {}) {
  const socket = {
    remoteAddress: options.remoteAddress || '127.0.0.1',
    destroy() {},
  };

  const clientIp = options.ip || options.remoteAddress || '127.0.0.1';

  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    originalUrl: options.url || '/',
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    cookies: options.cookies || {},
    user: options.user || null,
    branchScope: options.branchScope || null,
    ip: clientIp,
    socket,
    connection: socket,
    app: {
      get: (k) => (k === 'trust proxy' ? false : undefined),
    },
    ...options.req,
  };

  const res = {
    statusCode: 200,
    headersSent: false,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers = this.headers || {};
      this.headers[key] = val;
      this.headers[key.toLowerCase()] = val;
    },
    getHeader(key) {
      this.headers = this.headers || {};
      return this.headers[key] || this.headers[key.toLowerCase()];
    },
    removeHeader(key) {
      this.headers = this.headers || {};
      delete this.headers[key];
      delete this.headers[key.toLowerCase()];
    },
    cookie(name, val, opts) {
      this.cookies = this.cookies || {};
      this.cookies[name] = { val, opts };
      return this;
    },
    clearCookie(name) {
      if (this.cookies) delete this.cookies[name];
      return this;
    },
  };

  let nextCalled = false;
  let nextError = null;
  const next = (err) => {
    nextCalled = true;
    if (err) nextError = err;
  };

  return {
    req,
    res,
    next,
    getNext: () => ({ nextCalled, nextError }),
  };
}

module.exports = {
  app,
  mockReqRes,
};
