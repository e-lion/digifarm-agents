import Link from 'next/link'
import { LayoutDashboard, Users, Map as MapIcon, LogOut, ShoppingBag, Activity, ShieldCheck, ClipboardList } from 'lucide-react'
import { AdminMobileNav } from './AdminMobileNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-bold text-green-700">DigiFarm Admin</h1>
        <form action="/auth/signout" method="post">
          <button className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors" aria-label="Sign Out">
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-green-700">DigiFarm Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <LayoutDashboard className="h-5 w-5" />
            Overview
          </Link>
          <Link href="/admin/agents" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <Users className="h-5 w-5" />
            Agents
          </Link>
          <Link href="/admin/visits" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <ClipboardList className="h-5 w-5" />
            Visits
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <ShieldCheck className="h-5 w-5" />
            Users
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <Activity className="h-5 w-5" />
            Analytics
          </Link>
          <Link href="/admin/buyers" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <ShoppingBag className="h-5 w-5" />
            Buyers
          </Link>
          <Link href="/admin/map" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
            <MapIcon className="h-5 w-5" />
            Global Map
          </Link>
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
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mb-16 md:mb-0 md:ml-64">
        {children}
      </main>

      {/* Mobile Navigation */}
      <AdminMobileNav />
    </div>
  )
}
