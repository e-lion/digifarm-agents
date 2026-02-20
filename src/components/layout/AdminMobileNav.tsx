'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShoppingBag, Map, Activity, ShieldCheck, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminMobileNav() {
  const pathname = usePathname()

  const links = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity },
    { href: '/admin/agents', label: 'Agents', icon: Users },
    { href: '/admin/visits', label: 'Visits', icon: ClipboardList },
    { href: '/admin/users', label: 'Users', icon: ShieldCheck },
    { href: '/admin/buyers', label: 'Buyers', icon: ShoppingBag },
    { href: '/admin/map', label: 'Map', icon: Map },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[2000] bg-white border-t border-gray-200 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
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
