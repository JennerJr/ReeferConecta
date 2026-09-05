
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-session'
import Navbar from '@/components/navbar'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const user = await getSessionUser()
    if (!user) redirect('/login')
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-800">
      <Navbar />

      <header className="relative bg-gray-800 after:pointer-events-none after:absolute after:inset-x-0 after:inset-y-0 after:border-y after:border-white/10" />

      <main className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}