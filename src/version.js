// Single source of truth for the version: vite.config.js reads package.json at build time and injects these two constants.
// Nothing else in src/ may contain a version string. Tests (tests/unit/version.test.js) enforce that.
/* global __APP_VERSION__, __BUILD_ID__ */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev'
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'local'
export const versionLabel = () => `Aurora v${APP_VERSION}`
export const buildLabel = () => (BUILD_ID === 'local' ? 'Local build' : `Build ${BUILD_ID}`)
