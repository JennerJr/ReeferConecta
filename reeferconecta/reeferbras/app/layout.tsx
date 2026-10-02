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
    <html lang="pt-BR" data-theme="dark">
      <head>
        {/* Aplica o tema salvo antes da pintura para evitar flash do tema errado */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var t=localStorage.getItem('reeferconecta-theme');document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');}catch(e){}})();",
          }}
        />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
