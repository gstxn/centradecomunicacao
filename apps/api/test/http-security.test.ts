import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';

test('login aplica bloqueio depois de cinco credenciais inválidas', async () => {
  const { app } = await import('../src/server.js');
  await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
  const port = (app.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/auth/login`;

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'rate-limit@example.test', password: 'incorreta' })
      });
      assert.equal(response.status, 401);
    }

    const blocked = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'rate-limit@example.test', password: 'incorreta' })
    });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  } finally {
    await new Promise<void>((resolve, reject) => app.close((error) => error ? reject(error) : resolve()));
  }
});
