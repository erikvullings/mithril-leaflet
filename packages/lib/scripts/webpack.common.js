const path = require('path');
const webpack = require('webpack'); //to access built-in plugins

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'web',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../dist'),
    // library: 'mithril-leaflet',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    // filename: 'index.js',
    // globalObject: 'this'//,
    // path: path.resolve(__dirname, '../dist'),
  },
  externals: {
    mithril: 'mithril',
    leaflet: 'leaflet',
    'leaflet-draw': 'leaflet-draw',
    'leaflet/dist/leaflet.css': 'leaflet/dist/leaflet.css',
    'leaflet-draw/dist/leaflet.draw.css': 'leaflet-draw/dist/leaflet.draw.css',
    'leaflet/dist/images/marker-icon-2x.png': 'leaflet/dist/images/marker-icon-2x.png',
    'leaflet/dist/images/marker-icon.png': 'leaflet/dist/images/marker-icon.png',
    'leaflet/dist/images/marker-shadow.png': 'leaflet/dist/images/marker-shadow.png',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'awesome-typescript-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1, // 0 => no loaders (default); 1 => postcss-loader; 2 => postcss-loader, sass-loader
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            // options: {
            //   name(file) {
            //     console.log(file)
            //     if (file.match(/(layers-2x\.png|layers\.png|marker-icon\.png|marker-icon-2x\.png|marker-shadow\.png)/)) {
            //       return '[name].[ext]'
            //     }

            //     return '[name]-[hash].[ext]'
            //   },
            // }
            options: {
              name: './assets/[name].[ext]',
            },
          },
          // 'file-loader', // 'file-loader' is used as url-loader fallback anyways
          // 'url-loader?limit=8192', // 'file-loader' is used as url-loader fallback anyways
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [new webpack.ProgressPlugin()],
};
