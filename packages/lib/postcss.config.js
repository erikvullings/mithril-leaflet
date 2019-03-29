module.exports = ({ env }) => ({
  // Include source maps in dev builds
  map: env === 'production' ? false : { inline: true },
  plugins: {
    'postcss-preset-env': {},
    autoprefixer: {
      browsers: ['last 2 versions', 'ie >= 10', 'iOS >= 8'],
      grid: true,
    },
    // Minify prod builds
    cssnano: env === 'production' ? {} : false,
    'postcss-clean': env === 'production' ? {} : false,
  },
});
