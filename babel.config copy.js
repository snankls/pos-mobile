module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // [
      //   'module:react-native-dotenv',
      //   {
      //     moduleName: '@env',
      //     path: process.env.APP_ENV === 'production' ? '.env.prod' : '.env',
      //     safe: false,
      //     allowUndefined: true,
      //   },
      // ],
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            assets: './assets',
          },
        },
      ],
    ],
  };
};
