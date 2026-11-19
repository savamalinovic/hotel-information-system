import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from '../lib/auth/AuthContext'
import { getQueryClient } from '../lib/queryClient'
import '../lib/i18n'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'BlueStars Manager' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  return (
    <html lang={i18n.resolvedLanguage ?? i18n.language}>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={getQueryClient()}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
