import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLanguagePreference } from '../src/i18n/languagePreference.ts';

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

test('a saved supported language is restored only once', async () => {
  const applied = [];
  let reads = 0;
  const preference = createLanguagePreference({
    read: async () => { reads++; return 'en'; },
    write: async () => assert.fail('restoration must not write'),
    apply: (language) => applied.push(language),
  });
  await Promise.all([preference.restore(), preference.restore()]);
  assert.equal(reads, 1);
  assert.deepEqual(applied, ['en']);
});

test('a delayed saved language cannot overwrite the user selection', async () => {
  const stored = deferred();
  const applied = [];
  const saved = [];
  const preference = createLanguagePreference({
    read: () => stored.promise,
    write: async (language) => { saved.push(language); },
    apply: (language) => applied.push(language),
  });
  const restoring = preference.restore();
  assert.equal(await preference.select('sr'), true);
  stored.resolve('en');
  await restoring;
  assert.deepEqual(applied, ['sr']);
  assert.deepEqual(saved, ['sr']);
});

test('rapid selections apply immediately and persist in selection order', async () => {
  const firstWrite = deferred();
  const applied = [];
  const writes = [];
  const preference = createLanguagePreference({
    read: async () => null,
    write: async (language) => {
      writes.push(language);
      if (writes.length === 1) await firstWrite.promise;
    },
    apply: (language) => applied.push(language),
  });
  const first = preference.select('en');
  const second = preference.select('sr');
  await Promise.resolve();
  assert.deepEqual(applied, ['en', 'sr']);
  assert.deepEqual(writes, ['en']);
  firstWrite.resolve();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(writes, ['en', 'sr']);
});

for (const saved of [null, '', 'de', 'en-US']) {
  test(`unsupported stored language ${JSON.stringify(saved)} keeps the current language`, async () => {
    const preference = createLanguagePreference({
      read: async () => saved,
      write: async () => assert.fail('invalid language must not write'),
      apply: () => assert.fail('invalid language must not apply'),
    });
    await preference.restore();
    assert.equal(await preference.select('de'), false);
  });
}

test('read failure keeps the current language and later selection still saves', async () => {
  const applied = [];
  const preference = createLanguagePreference({
    read: async () => { throw new Error('storage unavailable'); },
    write: async () => {},
    apply: (language) => applied.push(language),
  });
  await preference.restore();
  assert.deepEqual(applied, []);
  assert.equal(await preference.select('en'), true);
  assert.deepEqual(applied, ['en']);
});

test('a failed save reports failure without blocking a later selection', async () => {
  const applied = [];
  const writes = [];
  const preference = createLanguagePreference({
    read: async () => null,
    write: async (language) => {
      writes.push(language);
      if (writes.length === 1) throw new Error('storage unavailable');
    },
    apply: (language) => applied.push(language),
  });
  const first = preference.select('en');
  const second = preference.select('sr');
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.deepEqual(applied, ['en', 'sr']);
  assert.deepEqual(writes, ['en', 'sr']);
});
