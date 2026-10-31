const assert = require('node:assert/strict');
const { test } = require('node:test');
const configure = require('../app.config');
const config = require('../app.json').expo;

test('API profiles and release guard', () => {
  const original = { ...process.env };
  try {
    delete process.env.EAS_BUILD_PROFILE;
    delete process.env.BLUESTARS_API_URL;
    process.env.BLUESTARS_API_PROFILE = 'production';
    const production = configure({ config });
    assert.equal(production.extra.apiBaseUrl, 'https://hotel-information-system-production.up.railway.app/api/v1');
    assert.equal(production.plugins.at(-1)[1].android.usesCleartextTraffic, false);
    for (const url of ['', 'invalid', 'http://localhost:8080/api/v1', 'http://127.0.0.1:8080/api/v1', 'http://hotel-information-system-production.up.railway.app/api/v1']) {
      process.env.BLUESTARS_API_URL = url;
      assert.throws(() => configure({ config }));
    }
    delete process.env.BLUESTARS_API_URL;
    process.env.BLUESTARS_API_PROFILE = 'development';
    const development = configure({ config });
    assert.equal(development.extra.apiBaseUrl, 'http://127.0.0.1:8080/api/v1');
    assert.equal(development.plugins.at(-1)[1].android.usesCleartextTraffic, true);
    process.env.EAS_BUILD_PROFILE = 'production';
    assert.throws(() => configure({ config }));
  } finally {
    process.env = original;
  }
});
