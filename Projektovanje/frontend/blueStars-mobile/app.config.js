const PRODUCTION_URL = 'https://hotel-information-system-production.up.railway.app/api/v1';
const DEVELOPMENT_URL = 'http://127.0.0.1:8080/api/v1';

module.exports = ({ config }) => {
  const profile = process.env.BLUESTARS_API_PROFILE ?? 'production';
  const easProfile = process.env.EAS_BUILD_PROFILE;
  if (!['development', 'production'].includes(profile)) {
    throw new Error('Invalid BLUESTARS_API_PROFILE');
  }
  if (easProfile && profile === 'development' && !['development', 'ios-simulator'].includes(easProfile)) {
    throw new Error('Development API is forbidden for this EAS build profile');
  }
  const apiBaseUrl = process.env.BLUESTARS_API_URL ??
    (profile === 'development' ? DEVELOPMENT_URL : PRODUCTION_URL);
  if (apiBaseUrl !== (profile === 'development' ? DEVELOPMENT_URL : PRODUCTION_URL)) {
    throw new Error(`Invalid API URL for ${profile} profile`);
  }
  return {
    ...config,
    extra: { ...config.extra, apiBaseUrl },
    plugins: [
      ...config.plugins,
      ['expo-build-properties', { android: { usesCleartextTraffic: profile === 'development' } }],
    ],
  };
};
