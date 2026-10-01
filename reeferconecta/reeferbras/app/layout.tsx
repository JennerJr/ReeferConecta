import type { Metadata, Viewport } from 'next'
import './globals.css'
import RegisterServiceWorker from '@/components/register-service-worker'

export const metadata: Metadata = {
  title: 'ReeferConecta',
  description: 'Gestão de peças, relatórios e chamados de containers reefer',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1F2937',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
