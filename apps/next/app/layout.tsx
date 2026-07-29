import { StylesProvider } from './styles-provider'
import { Provider } from 'app/provider'
import { ServiceWorkerRegister } from './service-worker-register'
import './globals.css'
import logoImage from 'app/assets/images/hackmty-logo-favicon.webp'

export const metadata = {
  title: 'HackMTY',
  description: 'The HackMTY 2026 Experience',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: logoImage.src, type: 'image/webp' }],
    shortcut: [{ url: logoImage.src, type: 'image/webp' }],
    apple: [{ url: logoImage.src, type: 'image/webp' }],
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
      </head>
      <body>
        <StylesProvider>
          <Provider>
            <ServiceWorkerRegister />
            {children}
          </Provider>
        </StylesProvider>
      </body>
    </html>
  )
}
