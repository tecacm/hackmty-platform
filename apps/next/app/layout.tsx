import { StylesProvider } from './styles-provider'
import { Provider } from 'app/provider'
import { ServiceWorkerRegister } from './service-worker-register'
import './globals.css'
import logoImage from 'app/assets/images/hackmty-logo-favicon.webp'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'HackMTY',
  description: 'The HackMTY 2026 Experience',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: logoImage.src, type: 'image/webp' }],
    shortcut: [{ url: logoImage.src, type: 'image/webp' }],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
          <meta name="apple-mobile-web-app-capable" content="yes"/>
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
      </head>
      <body>
        <StylesProvider>
          <Provider>
            <ServiceWorkerRegister />
            {children}
          </Provider>
        </StylesProvider>
        <Analytics/>
      </body>
    </html>
  )
}
