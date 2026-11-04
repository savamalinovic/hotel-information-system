import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createInstance } from 'i18next';
import { getAuthErrorMessage } from '../src/util/apiError.ts';

for (const language of ['sr', 'en']) {
  const translations = JSON.parse(readFileSync(new URL(`../assets/locales/${language}.json`, import.meta.url), 'utf8'));
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: { translation: translations } }, initImmediate: false });

  test(`${language} authentication failures render localized text instead of raw keys or server details`, () => {
    const secretDetails = 'private infrastructure detail';
    const failures = [
      [{ isAxiosError: true, response: { status: 401, data: { message: secretDetails } } }, 'invalidCredentials'],
      [{ isAxiosError: true, code: 'ECONNABORTED' }, 'timeout'],
      [{ isAxiosError: true, code: 'ETIMEDOUT' }, 'timeout'],
      [{ isAxiosError: true }, 'network'],
      [{ isAxiosError: true, response: { status: 503, data: { message: secretDetails } } }, 'server'],
      [new Error(secretDetails), 'server'],
    ];
    for (const [error, expected] of failures) {
      const key = `auth.errors.${expected}`;
      assert.equal(i18n.exists(key), true, `missing ${language} translation: ${key}`);
      const message = getAuthErrorMessage(error, i18n.t.bind(i18n));
      assert.equal(message, translations.auth.errors[expected]);
      assert.notEqual(message, key);
      assert.notEqual(message, secretDetails);
    }
  });
}
