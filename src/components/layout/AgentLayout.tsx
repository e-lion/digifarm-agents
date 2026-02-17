import { MobileNav } from './MobileNav'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-gray-900">DigiFarm Agent</h1>
      </header>
      <main className="p-4 space-y-4">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
