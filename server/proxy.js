import http from 'node:http';
import https from 'node:https';
import { Transform } from 'node:stream';

export function apiProxy(upstream, { maxBytes = 26 * 1024 * 1024, timeoutMs = 90000 } = {}) {
  const transport = upstream.protocol === 'https:' ? https : http;
  return (req, res) => {
    // Forward only the headers required by this API. Browser Origin, cookies and
    // untrusted forwarding headers must not be passed to the fixed upstream.
    const headers = {};
    for (const key of ['authorization', 'content-type', 'content-length', 'accept']) {
      if (req.headers[key]) headers[key] = req.headers[key];
    }
    let size = 0;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        size += chunk.length;
        if (size > maxBytes) callback(Object.assign(new Error('Body too large'), { code: 'BODY_TOO_LARGE' }));
        else callback(null, chunk);
      },
    });
    function fail(status, message) {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.destroy(); return; }
      res.status(status).json({ success: false, message });
    }
    const outgoing = transport.request({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || undefined,
      path: req.originalUrl,
      method: req.method,
      headers,
    }, (incoming) => {
      // API redirects must not send the browser outside the same-origin relay.
      if (incoming.statusCode >= 300 && incoming.statusCode < 400) {
        incoming.resume();
        fail(502, '업무 서버의 API 주소를 확인해 주세요.');
        return;
      }
      res.status(incoming.statusCode || 502);
      for (const key of ['content-type', 'content-length', 'content-encoding', 'content-disposition', 'retry-after']) {
        if (incoming.headers[key]) res.setHeader(key, incoming.headers[key]);
      }
      res.setHeader('Cache-Control', 'no-store');
      incoming.on('error', () => fail(502, '업무 서버의 응답이 중단되었습니다.'));
      incoming.pipe(res);
    });
    const timer = setTimeout(() => {
      fail(504, '서버 응답이 지연되고 있습니다. 처리 결과를 확인한 후 다시 시도해 주세요.');
      outgoing.destroy();
    }, timeoutMs);
    timer.unref();
    outgoing.on('error', () => fail(502, '업무 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    limit.on('error', () => {
      req.unpipe(limit);
      req.resume();
      fail(413, '파일 용량이 너무 큽니다.');
      outgoing.destroy();
    });
    req.on('aborted', () => outgoing.destroy());
    req.on('error', () => outgoing.destroy());
    res.on('close', () => {
      clearTimeout(timer);
      outgoing.destroy();
      limit.destroy();
    });
    req.pipe(limit).pipe(outgoing);
  };
}
