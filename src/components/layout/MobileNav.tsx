'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, List, User, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const links = [
    { href: '/agent/routes', label: 'Routes', icon: List },
    { href: '/agent/map', label: 'Map', icon: Map },
    { href: '/agent/visit/new', label: 'New Visit', icon: PlusCircle }, // Shortcut
    { href: '/agent/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/agent/routes' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive ? 'text-green-700' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'fill-current/10')} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
