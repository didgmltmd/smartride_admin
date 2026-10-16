import { createApp } from './app.js';
const port = Number(process.env.PORT || 3001);
const server = createApp().listen(port, '0.0.0.0', () => console.log(`Smart Ride admin listening on port ${port}`));
server.requestTimeout = 100000;
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
