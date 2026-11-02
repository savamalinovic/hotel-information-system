import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupSignOut } from '../src/session/cleanupSignOut.ts';
import { isMobilePushRole } from '../src/notifications/mobilePushPolicy.ts';

for (const [name, token, fails] of [['without token', null, false], ['with old token', 'old-token', false], ['with failed unregister', 'old-token', true]]) {
  test(`manager ${name} clears preference, session and cache`, async () => {
    const calls = [];
    const state = { session: true, cache: true };
    const result = await cleanupSignOut({ email: 'manager@example.test', token: 'session-token' }, {
      readToken: async () => token,
      unregister: async (value) => { calls.push(value); if (fails) throw new Error('offline'); },
      isCurrent: (value) => value === 'session-token',
      clearPreference: async () => { calls.push('cleared'); },
      clearSession: async () => { state.session = false; state.cache = false; },
    });
    assert.deepEqual(calls, token ? ['old-token', 'cleared'] : ['cleared']);
    assert.deepEqual(state, { session: false, cache: false });
    assert.equal(result.pushCleanupFailed, fails);
  });
}
test('manager is excluded from mobile push lifecycle', () => {
  assert.equal(isMobilePushRole('MANAGER'), false);
  assert.equal(isMobilePushRole('AGENT'), true);
  assert.equal(isMobilePushRole('OPERATIONAL_WORKER'), true);
  assert.equal(isMobilePushRole(undefined), false);
});
test('unresponsive local storage cannot prevent manager sign-out', async () => {
  const never = () => new Promise(() => {});
  let cleared = false;
  const result = await cleanupSignOut({ email: 'manager@example.test', token: 'session-token' }, {
    readToken: never,
    unregister: async () => assert.fail('unknown token must not be unregistered'),
    isCurrent: () => true,
    clearPreference: never,
    clearSession: async () => { cleared = true; },
  });
  assert.equal(cleared, true);
  assert.equal(result.pushCleanupFailed, true);
});
