'use client'

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { canAccessTeams } from '@/lib/authorization';

function Bars3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  )
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.857 17.082A23.848 23.848 0 0 1 12 17.25c-2.4 0-4.74-.28-6.857-.668M15.75 17.25v.375c0 .69-.56 1.25-1.25 1.25h-4.999c-.69 0-1.25-.56-1.25-1.25V17.25m10-6.75c0-1.27-.2-2.5-.57-3.66a3.694 3.694 0 0 0-3.38-2.59A3.695 3.695 0 0 0 9.32 6.84c-1.44.07-2.65.93-3.18 2.21A8.206 8.206 0 0 0 5.25 10.5v1.5l-1.5 2.5h16.5l-1.5-2.5v-1.5Z" />
    </svg>
  )
}

function XMarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

const defaultUser = {
  name: 'Usuário',
  email: '',
  role: '',
  imageUrl:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Almoxarifado', href: '/pecas' },
  { name: 'Times', href: '/times' },
  { name: 'Reports', href: '/reports' },
]

const userNavigation = [
  { name: 'Meu perfil', href: '/profile' },
  { name: 'Sair', href: '/login' },
]

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [user, setUser] = useState(defaultUser)
  const isActive = (href: string) => href !== '#' && (pathname === href || pathname.startsWith(`${href}/`))

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão')
      setProfileMenuOpen(false)
      setMobileMenuOpen(false)
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('[Navbar] logout failed', error)
    }
  }

  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then((data) => { if (data.user) setUser({ ...defaultUser, ...data.user }) })
      .catch(() => undefined)
  }, [])

  return (
    <nav className="bg-gray-800/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="shrink-0">
              <Image
                alt="Reeferbras Logo"
                src="icons/reeferbras-r-icon.svg"
                width={50}
                height={50}
              
              />
            </div>
            <div className="min-w-0">
              <div className="ml-4 hidden flex-wrap items-baseline gap-2 lg:flex xl:ml-10">
                {navigation.filter((item) => item.href !== '/times' || canAccessTeams(user.role)).map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={classNames(
                      isActive(item.href) ? 'bg-gray-950/50 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium',
                    )}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="relative rounded-full p-1 text-gray-400 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
              >
                <span className="absolute -inset-1.5" />
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              <div className="relative ml-3">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  aria-expanded={profileMenuOpen}
                  aria-label="Open user menu"
                >
                  <span className="absolute -inset-1.5" />
                  <img
                    alt=""
                    src={user.imageUrl}
                    className="size-8 rounded-full outline -outline-offset-1 outline-white/10"
                  />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-gray-800 py-1 outline-1 -outline-offset-1 outline-white/10">
                    {userNavigation.map((item) => item.name === 'Sair' ? (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => void handleLogout()}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:outline-hidden"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <a key={item.name} href={item.href} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:outline-hidden">
                        {item.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="-mr-2 flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
            >
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className={`block size-6 ${mobileMenuOpen ? 'hidden' : ''}`} />
              <XMarkIcon aria-hidden="true" className={`size-6 ${mobileMenuOpen ? 'block' : 'hidden'}`} />
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            {navigation.filter((item) => item.href !== '/times' || canAccessTeams(user.role)).map((item) => (
              <a
                key={item.name}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={classNames(
                  isActive(item.href) ? 'bg-gray-950/50 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                  'block rounded-md px-3 py-2 text-base font-medium',
                )}
              >
                {item.name}
              </a>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 pb-3">
            <div className="flex items-center px-5">
              <div className="shrink-0">
                <img
                  alt=""
                  src={user.imageUrl}
                  className="size-10 rounded-full outline -outline-offset-1 outline-white/10"
                />
              </div>
              <div className="ml-3">
                <div className="text-base/5 font-medium text-white">{user.name}</div>
                <div className="text-sm font-medium text-gray-400">{user.email}</div>
              </div>
              <button
                type="button"
                className="relative ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
              >
                <span className="absolute -inset-1.5" />
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-3 space-y-1 px-2">
              {userNavigation.map((item) => item.name === 'Sair' ? (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  {item.name}
                </button>
              ) : (
                <a key={item.name} href={item.href} className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-white/5 hover:text-white">
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}