import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { config } from '../packages/backend/src/config.ts';
import { guardedFetch } from '../packages/backend/src/lib/http-fetch.ts';
test('evidence fetch can inspect a redirect before following its host', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/initial') {
      res.writeHead(302, {
        location: '/final'
      });
      res.end();
    } else {
      res.end('final');
    }
  });
  const previous = config.allowPrivateNetworkFetch;
  config.allowPrivateNetworkFetch = true;
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as {
      port: number;
    };
    const response = await guardedFetch(`http://127.0.0.1:${address.port}/initial`, {
      followRedirects: false
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/final');
  } finally {
    config.allowPrivateNetworkFetch = previous;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
