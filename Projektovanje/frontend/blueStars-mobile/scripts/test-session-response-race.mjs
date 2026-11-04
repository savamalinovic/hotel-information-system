import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldEndSessionForResponse, persistCurrentSessionDownload } from '../src/session/sessionResponsePolicy.ts';

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

test('delayed account A unauthorized response cannot end account B session', async () => {
  const response = deferred();
  let currentToken = 'account-a';
  let ended = false;
  const pending = response.promise.then(() => {
    if (shouldEndSessionForResponse({ status: 401, url: '/tasks/1/attachments', authorization: 'Bearer account-a', currentToken, alreadyHandling: false })) ended = true;
  });
  currentToken = null;
  currentToken = 'account-b';
  response.resolve();
  await pending;
  assert.equal(ended, false);
  assert.equal(currentToken, 'account-b');
});

test('current account unauthorized response still ends its session', () => {
  assert.equal(shouldEndSessionForResponse({ status: 401, url: '/users/me', authorization: 'Bearer current', currentToken: 'current', alreadyHandling: false }), true);
});

test('login, anonymous, non-401 and repeated failures do not trigger session cleanup', () => {
  const current = { status: 401, url: '/users/me', authorization: 'Bearer current', currentToken: 'current', alreadyHandling: false };
  for (const change of [{ url: '/auth/login' }, { currentToken: null }, { authorization: undefined }, { status: 403 }, { alreadyHandling: true }]) {
    assert.equal(shouldEndSessionForResponse({ ...current, ...change }), false);
  }
});

for (const ending of ['unmount', 'logout', 'account switch']) {
  test(`PDF response after ${ending} does not create a protected cache file`, async () => {
    const download = deferred();
    const originalToken = 'account-a';
    let token = originalToken;
    let mounted = true;
    let writes = 0;
    const pending = persistCurrentSessionDownload(() => download.promise, {
      isCurrent: () => mounted && token === originalToken,
      persist: () => { writes++; return { uri: 'private-cache.pdf' }; },
      release: () => assert.fail('no file should have been written'),
    });
    if (ending === 'unmount') mounted = false;
    else token = ending === 'logout' ? null : 'account-b';
    download.resolve(new ArrayBuffer(8));
    assert.equal(await pending, null);
    assert.equal(writes, 0);
  });
}

test('current mounted account can persist its completed PDF', async () => {
  const content = new ArrayBuffer(8);
  const file = await persistCurrentSessionDownload(async () => content, {
    isCurrent: () => true,
    persist: (value) => { assert.equal(value, content); return { uri: 'private-cache.pdf' }; },
    release: () => assert.fail('current file should remain available'),
  });
  assert.equal(file.uri, 'private-cache.pdf');
});

test('a file acquired while its scope is invalidated is released immediately', async () => {
  let current = true;
  const released = [];
  const file = await persistCurrentSessionDownload(async () => new ArrayBuffer(8), {
    isCurrent: () => current,
    persist: () => { current = false; return { uri: 'private-cache.pdf' }; },
    release: (uri) => released.push(uri),
  });
  assert.equal(file, null);
  assert.deepEqual(released, ['private-cache.pdf']);
});

test('cancelled downloads preserve their error without writing a file', async () => {
  const error = new Error('cancelled');
  await assert.rejects(persistCurrentSessionDownload(async () => { throw error; }, {
    isCurrent: () => false,
    persist: () => assert.fail('cancelled request cannot persist'),
    release: () => assert.fail('no file acquired'),
  }), error);
});
