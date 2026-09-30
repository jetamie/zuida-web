/**
 * 最大影视站 —— 零依赖 Node 服务
 *
 * 1. 静态托管 public/
 * 2. /api/vod         代理最大资源网 JSON 接口（解决浏览器 CORS，含超时重试与短缓存）
 * 3. /media?u=        HLS 媒体代理（透传 m3u8/ts/key，重写播放列表地址，解决跨域与防盗链）
 *
 * 启动：node server.js   （默认端口 3000，可用 PORT=8080 node server.js 覆盖）
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const UPSTREAM = 'https://api.zuidapi.com/api.php/provide/vod/';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/* ---------------- 通用 HTTP 请求（自动跟随跳转、超时重试） ---------------- */

function fetchUpstream(targetUrl, { headers = {}, timeout = 15000, redirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch {
      return reject(new Error('BAD_URL'));
    }

    const lib = urlObj.protocol === 'http:' ? http : https;
    const req = lib.get(
      urlObj,
      {
        headers: {
          'User-Agent': UA,
          Accept: '*/*',
          ...headers
        }
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          res.resume();
          const next = new URL(res.headers.location, urlObj).href;
          return resolve(fetchUpstream(next, { headers, timeout, redirects: redirects - 1 }));
        }
        resolve(res);
      }
    );

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('UPSTREAM_TIMEOUT'));
    });
  });
}

async function fetchJson(targetUrl, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchUpstream(targetUrl, { headers: { Accept: 'application/json' } });
      const chunks = [];
      for await (const c of res) chunks.push(c);
      const text = Buffer.concat(chunks).toString('utf8');
      return { status: res.statusCode, text };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/* ---------------- API 响应缓存（短 TTL，降低重复请求） ---------------- */

const apiCache = new Map();
const API_TTL_MS = 90 * 1000;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

async function handleApi(req, res, urlObj) {
  const ALLOWED = ['ac', 't', 'pg', 'wd', 'h', 'ids'];
  const params = [];
  for (const key of ALLOWED) {
    const v = urlObj.searchParams.get(key);
    if (v !== null && v !== '') params.push(`${key}=${encodeURIComponent(v)}`);
  }
  if (!params.some((p) => p.startsWith('ac='))) params.unshift('ac=list');
  const cacheKey = params.join('&');

  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < API_TTL_MS) {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'HIT'
    });
    return res.end(cached.body);
  }

  try {
    const { text } = await fetchJson(`${UPSTREAM}?${cacheKey}`);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return sendJson(res, 502, { success: false, error: { code: 1005, message: '上游数据解析失败' } });
    }
    if (!data || data.code !== 1) {
      return sendJson(res, 200, {
        success: false,
        error: { code: 1001, message: data && data.msg ? data.msg : '暂无数据' }
      });
    }
    apiCache.set(cacheKey, { ts: Date.now(), body: text });
    if (apiCache.size > 300) apiCache.delete(apiCache.keys().next().value);

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'MISS'
    });
    res.end(text);
  } catch (err) {
    const code = err.message === 'UPSTREAM_TIMEOUT' ? 1004 : 1003;
    const message = code === 1004 ? '视频资源服务请求超时' : '视频资源服务暂时不可用';
    sendJson(res, 502, { success: false, error: { code, message } });
  }
}

/* ---------------- M3U8 媒体代理 ---------------- */

function mediaLink(base, uri) {
  try {
    const abs = new URL(uri, base).href;
    return `/media?u=${encodeURIComponent(abs)}`;
  } catch {
    return uri;
  }
}

function rewriteManifest(text, base) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        // 重写 EXT-X-KEY / EXT-X-MAP 等标签中的 URI="..."
        return line.replace(/URI="([^"]+)"/gi, (m, uri) => `URI="${mediaLink(base, uri)}"`);
      }
      return mediaLink(base, trimmed);
    })
    .join('\n');
}

async function handleMedia(req, res, urlObj) {
  const target = urlObj.searchParams.get('u');
  if (!target) {
    res.writeHead(400);
    return res.end('missing u');
  }
  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error();
  } catch {
    res.writeHead(400);
    return res.end('bad url');
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const isManifest = /\.m3u8(\?|$)/i.test(targetUrl.pathname);
  const range = req.headers.range;
  const headers = {
    Referer: `${targetUrl.protocol}//${targetUrl.host}/`
  };
  if (range) headers.Range = range;

  try {
    const upstream = await fetchUpstream(targetUrl.href, { headers, timeout: 20000 });

    if (isManifest && upstream.statusCode >= 200 && upstream.statusCode < 300) {
      const chunks = [];
      for await (const c of upstream) chunks.push(c);
      const text = Buffer.concat(chunks).toString('utf8');
      const rewritten = rewriteManifest(text, targetUrl.href);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(rewritten);
    }

    // 分片 / 密钥 / 其它二进制：透传状态与关键响应头
    const passthrough = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified'
    ];
    const outHeaders = { 'Access-Control-Allow-Origin': '*' };
    for (const h of passthrough) {
      if (upstream.headers[h]) outHeaders[h] = upstream.headers[h];
    }
    res.writeHead(upstream.statusCode, outHeaders);
    upstream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(`media proxy error: ${err.message}`);
    }
  }
}

/* ---------------- 静态文件 ---------------- */

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA 回退
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      return fs.createReadStream(fallback).pipe(res);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ---------------- 服务入口 ---------------- */

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = urlObj.pathname;

  if (p === '/api/vod') return handleApi(req, res, urlObj);
  if (p === '/media') return handleMedia(req, res, urlObj);
  return serveStatic(req, res, p);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  最大影视站已启动');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
});
