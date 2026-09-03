

import Navbar from '@/components/navbar'
import '../globals.css'



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full bg-gray-800/50">
      <body className="h-full">
        <div className="min-h-screen bg-gray-800">
          <Navbar />

          <header className="relative bg-gray-800 after:pointer-events-none after:absolute after:inset-x-0 after:inset-y-0 after:border-y after:border-white/10">
            
             
          </header>

          <main className="bg-gray-800">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}