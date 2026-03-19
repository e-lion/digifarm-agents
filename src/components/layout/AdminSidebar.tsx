'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Map as MapIcon, LogOut, ShoppingBag, Activity, ShieldCheck, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from '@/components/org/OrgSwitcher'

export default function AdminSidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/agents', label: 'Agents', icon: Users },
    { href: '/admin/visits', label: 'Visits', icon: ClipboardList },
    { href: '/admin/users', label: 'Users', icon: ShieldCheck },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity },
    { href: '/admin/buyers', label: 'Buyers', icon: ShoppingBag },
    { href: '/admin/map', label: 'Global Map', icon: MapIcon },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0 left-0 z-50">
      <div className="p-4 border-b border-gray-100">
        <OrgSwitcher />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-green-100 text-green-800 font-medium'
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-green-700')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <form action="/auth/signout" method="post">
          <button className="flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
