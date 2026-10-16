import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { apiProxy } from './proxy.js';
import path from 'node:path';

export const DEFAULT_UPSTREAM = 'https://sinyongtaxi-i7e5.onrender.com';
const routes = [
  ['POST', /^\/api\/auth\/login$/],
  ['GET', /^\/api\/admin\/users(?:\/retired|\/[^/]+)?$/],
  ['POST', /^\/api\/admin\/users$/],
  ['DELETE', /^\/api\/admin\/users\/[^/]+$/],
  ['PUT', /^\/api\/admin\/users\/[^/]+\/(?:password|restore)$/],
  ['GET', /^\/api\/admin\/messages(?:\/[^/]+\/reads)?$/],
  ['POST', /^\/api\/admin\/messages$/],
  ['PUT', /^\/api\/admin\/messages\/[^/]+$/],
  ['DELETE', /^\/api\/admin\/messages\/[^/]+$/],
  ['POST', /^\/api\/admin\/uploads\/images$/],
  ['POST', /^\/api\/admin\/excel\/settlements$/],
];
export function isAllowedApi(method, pathname) {
  return !/%2f|%5c|%2e|\\/i.test(pathname) && routes.some(([verb, pattern]) => method === verb && pattern.test(pathname));
}
export function createApp({ upstreamOrigin = process.env.API_ORIGIN || DEFAULT_UPSTREAM, staticDir = path.resolve('dist'), loginLimit = 30, production = process.env.NODE_ENV === 'production', proxyOptions } = {}) {
  const upstream = new URL(upstreamOrigin);
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) throw new Error('API_ORIGIN must be an HTTP(S) origin without credentials or a path.');
  if (production && upstream.protocol !== 'https:') throw new Error('Production API_ORIGIN must use HTTPS.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginEmbedderPolicy: false, strictTransportSecurity: production ? undefined : false, contentSecurityPolicy: production ? undefined : false }));
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!isAllowedApi(req.method, req.originalUrl.split('?')[0])) return res.status(404).json({ success: false, message: '지원하지 않는 API 요청입니다.' });
    const origin = req.get('origin');
    const expected = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== expected) return res.status(403).json({ success: false, message: '허용되지 않은 요청 출처입니다.' });
    if (req.originalUrl.split('?')[0] !== '/api/auth/login' && !/^Bearer \S+$/i.test(req.get('authorization') || '')) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    if (Number(req.get('content-length')) > 26 * 1024 * 1024) return res.status(413).json({ success: false, message: '파일 용량이 너무 큽니다.' });
    next();
  });
  app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000, limit: loginLimit, standardHeaders: 'draft-8', legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) => res.status(429).json({ success: false, message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' }),
  }));
  // Do not parse the body here: JSON and multipart bodies must reach the upstream unchanged.
  app.use('/api', apiProxy(upstream, proxyOptions));
  app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'API를 찾을 수 없습니다.' }));
  app.use(express.static(staticDir, { index: false, setHeaders(res, file) { res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'); } }));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticDir, 'index.html'), (error) => { if (error) next(error); });
  });
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    const status = error.status === 404 ? 404 : 500;
    res.status(status).json({ success: false, message: status === 404 ? '페이지를 찾을 수 없습니다. 먼저 웹 빌드를 실행해 주세요.' : '요청 처리 중 오류가 발생했습니다.' });
  });
  return app;
}
