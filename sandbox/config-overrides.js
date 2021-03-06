const webpack = require('webpack');
module.exports = function override(config) {
  config.resolve.symlinks = false;
  config.resolve.fallback = {
    util: require.resolve('util/'),
    url: require.resolve('url'),
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  );

  return config;
}