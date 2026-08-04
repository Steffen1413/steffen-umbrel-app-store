const http = require('http');
const net = require('net');

const UPSTREAM_HOST = process.env.HERMES_UPSTREAM_HOST || 'hermes-agent_web_1';
const UPSTREAM_PORT = Number(process.env.HERMES_UPSTREAM_PORT || 18789);
const LISTEN_PORT = Number(process.env.PORT || 8080);

let cachedToken = '';
let cachedAt = 0;
const TOKEN_TTL_MS = 5000;

function upstreamRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 8000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('upstream timeout')));
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken(force = false) {
  if (!force && cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  const res = await upstreamRequest('/');
  const html = res.body.toString('utf8');
  const match = html.match(/window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
  if (!match) throw new Error('Hermes session token not found');
  cachedToken = match[1];
  cachedAt = Date.now();
  return cachedToken;
}

function copyHeaders(headers) {
  const out = { ...headers };
  delete out.host;
  delete out.connection;
  delete out['content-length'];
  return out;
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    try {
      const body = Buffer.concat(chunks);
      const headers = copyHeaders(req.headers);
      if (req.url.startsWith('/api')) {
        headers['x-hermes-session-token'] = await getToken();
      }
      if (body.length) headers['content-length'] = String(body.length);
      let upstream = await upstreamRequest(req.url, { method: req.method, headers, body });
      if (upstream.statusCode === 401 && req.url.startsWith('/api')) {
        headers['x-hermes-session-token'] = await getToken(true);
        upstream = await upstreamRequest(req.url, { method: req.method, headers, body });
      }
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      res.end(upstream.body);
    } catch (err) {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(`bridge upstream error: ${err.message}`);
    }
  });
});

server.on('upgrade', async (req, socket) => {
  try {
    const token = await getToken();
    const target = new URL(req.url, `http://${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
    if (target.pathname.startsWith('/api/ws')) target.searchParams.set('token', token);
    const upstream = net.connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
      const headers = copyHeaders(req.headers);
      headers.host = `${UPSTREAM_HOST}:${UPSTREAM_PORT}`;
      headers.connection = 'Upgrade';
      headers.upgrade = req.headers.upgrade || 'websocket';
      const lines = [`${req.method} ${target.pathname}${target.search} HTTP/${req.httpVersion}`];
      for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
      upstream.write(lines.join('\r\n') + '\r\n\r\n');
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
  } catch {
    socket.destroy();
  }
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`Hermes desktop bridge listening on ${LISTEN_PORT}, upstream ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
});
