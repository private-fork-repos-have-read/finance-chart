const webpackMerge = require('webpack-merge');
const baseConfig = require('./webpack.base');

module.exports = env => {
  const config = webpackMerge(
    baseConfig(env),
    {
      mode: 'production',
      output: {
        filename: '[name].production.min.js'
      },
    }
  );
  return config;
};