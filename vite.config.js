import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react'
import {readFileSync} from 'node:fs'
// The ONE source of the displayed version is package.json. It is injected at build time (src/version.js reads these constants).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
// Optional build id: the short commit hash GitHub Actions provides. Public information; never a secret. "local" for dev builds.
const build = (process.env.GITHUB_SHA || '').slice(0, 7) || 'local'
export default defineConfig({plugins:[react()],base:process.env.VITE_BASE||'./',
  define:{__APP_VERSION__:JSON.stringify(pkg.version),__BUILD_ID__:JSON.stringify(build)}})
