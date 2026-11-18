import { defineConfig, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import type { IncomingMessage } from 'node:http'

// Dev-only proxy target. The browser calls the same-origin /api/v1 and this
// plugin forwards it here, so local development never hits the backend's CORS
// policy. Change this together with the production URL in src/lib/api/client.ts.
const DEV_API_PROXY_TARGET = 'https://hotel-information-system-production.up.railway.app'

function apiProxyPlugin(): Plugin {
  return {
    name: 'bluestars-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/v1/')) {
          next()
          return
        }
        try {
          const method = req.method ?? 'GET'
          const upstream = await fetch(DEV_API_PROXY_TARGET + url, {
            method,
            headers: forwardHeaders(req.headers),
            body: method === 'GET' || method === 'HEAD' ? undefined : ((await readBody(req)) as unknown as BodyInit),
          })
          res.statusCode = upstream.status
          upstream.headers.forEach((value, key) => res.setHeader(key, value))
          const buffer = Buffer.from(await upstream.arrayBuffer())
          res.end(buffer)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function forwardHeaders(headers: IncomingMessage['headers']): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key === 'host' || key === 'origin' || key === 'content-length' || key === 'connection') continue
    if (typeof value === 'string') result[key] = value
    else if (Array.isArray(value)) result[key] = value.join(', ')
  }
  return result
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    apiProxyPlugin(),
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
