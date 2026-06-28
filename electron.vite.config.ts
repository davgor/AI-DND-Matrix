import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const DEV_SERVER_ORIGIN = 'http://localhost:5173'
const DEV_SERVER_WS_ORIGIN = 'ws://localhost:5173'

// Production CSP: no dev-server origins, no 'unsafe-eval', no 'unsafe-inline' anywhere —
// this app never uses inline scripts/styles, so neither is needed outside dev's HMR injection.
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: file:",
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

// Dev-only CSP: Vite's React Fast Refresh needs 'unsafe-inline'/'unsafe-eval' and the dev
// server's own origin for HMR — never shipped in a packaged build.
const DEV_CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DEV_SERVER_ORIGIN} ${DEV_SERVER_WS_ORIGIN}`,
  `style-src 'self' 'unsafe-inline'`,
  `connect-src 'self' ${DEV_SERVER_ORIGIN} ${DEV_SERVER_WS_ORIGIN}`,
  'img-src \'self\' data: file:',
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

function cspPlugin(isDev: boolean): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml(html) {
      return html.replace('%CSP%', isDev ? DEV_CSP : PROD_CSP)
    }
  }
}

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  return {
    main: {
      build: {
        outDir: 'out/main',
        rollupOptions: {
          input: 'src/main/index.ts'
        }
      }
    },
    preload: {
      build: {
        outDir: 'out/preload',
        rollupOptions: {
          input: 'src/preload/index.ts'
        }
      }
    },
    renderer: {
      root: 'src/renderer',
      build: {
        outDir: 'out/renderer',
        rollupOptions: {
          input: 'src/renderer/index.html'
        }
      },
      plugins: [react(), cspPlugin(isDev)]
    }
  }
})
