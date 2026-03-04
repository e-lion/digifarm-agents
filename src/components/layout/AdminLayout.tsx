import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { AdminMobileNav } from './AdminMobileNav'
import { AdminSidebar } from './AdminSidebar'

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
      <AdminSidebar />
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto mb-16 md:mb-0 md:ml-64">
        {children}
      </main>

      {/* Mobile Navigation */}
      <AdminMobileNav />
    </div>
  )
}
