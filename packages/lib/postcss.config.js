module.exports = ({ env }) => ({
  // Include source maps in dev builds
  map: env === 'production' ? false : { inline: true },
  plugins: {
    'postcss-preset-env': {},
    autoprefixer: {},
    // Minify prod builds
    cssnano: env === 'production' ? {} : false,
    'postcss-clean': env === 'production' ? {} : false,
  },
});
