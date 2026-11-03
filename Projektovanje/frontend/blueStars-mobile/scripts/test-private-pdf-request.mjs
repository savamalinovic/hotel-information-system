import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { privatePdfRequestOptions } from '../src/media/privatePdfRequestOptions.ts';

const require = createRequire(import.meta.url);
const { Request: NativeRequest } = require('whatwg-fetch');
const signedUri = 'https://storage.example.test/private.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=synthetic';

test('installed native fetch reproduces the signature-breaking cache query mutation', () => {
  const request = new NativeRequest(signedUri, { cache: 'no-store' });
  assert.notEqual(request.url, signedUri);
  assert.match(request.url, /[?&]_=/);
});

for (const platform of ['android', 'ios']) {
  test(`${platform} private PDF transport preserves the exact signed URL and excludes credentials`, () => {
    const controller = new AbortController();
    const options = privatePdfRequestOptions(platform, controller.signal);
    assert.equal(Object.hasOwn(options, 'cache'), false);
    assert.deepEqual(options.headers, { 'Cache-Control': 'no-store' });
    assert.equal(options.credentials, 'omit');
    assert.equal(options.signal, controller.signal);
    const request = new NativeRequest(signedUri, options);
    assert.equal(request.url, signedUri);
    assert.equal(request.credentials, 'omit');
    assert.equal(request.headers.get('cache-control'), 'no-store');
    assert.equal(request.headers.has('authorization'), false);
    assert.equal(request.signal, controller.signal);
    controller.abort();
    assert.equal(request.signal.aborted, true);
  });
}

test('web uses browser cache semantics without changing signed URL or adding authorization', () => {
  const controller = new AbortController();
  const options = privatePdfRequestOptions('web', controller.signal);
  assert.equal(options.cache, 'no-store');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.signal, controller.signal);
  const request = new globalThis.Request(signedUri, options);
  assert.equal(request.url, signedUri);
  assert.equal(request.headers.has('authorization'), false);
  controller.abort();
  assert.equal(request.signal.aborted, true);
});
