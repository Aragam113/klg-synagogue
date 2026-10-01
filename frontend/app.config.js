/**
 * app.json stays the source of truth. Only the GitHub Pages demo build (EXPO_PUBLIC_DEMO=1, task 16)
 * gets `experiments.baseUrl` — the site is served from https://<user>.github.io/klg-synagogue/.
 */
module.exports = ({ config }) =>
  process.env.EXPO_PUBLIC_DEMO === '1'
    ? {
        ...config,
        experiments: {
          ...config.experiments,
          baseUrl: process.env.DEMO_BASE_URL || '/klg-synagogue',
        },
      }
    : config;
