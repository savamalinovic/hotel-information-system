module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
            "@assets": "./assets",
            "@api": "./src/api",
            "@components": "./src/components",
            "@hooks": "./src/hooks",
            "@i18n": "./src/i18n",
            "@styles": "./src/styles",
            "@types/*": "./src/types/*",
            "@util/*": "./src/util/*",
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
