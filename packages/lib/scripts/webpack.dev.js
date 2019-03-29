const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  watch: true,
  devtool: 'inline-source-map',
  // optimization: {
  //   usedExports: true,
  //   splitChunks: {
  //     chunks: 'all',
  //   },
  // }
});
