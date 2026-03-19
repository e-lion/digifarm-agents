import { MobileNav } from './MobileNav'
import { SyncManager } from '@/components/providers/SyncManager'
import { OrganizationProvider } from '@/components/providers/OrganizationProvider'
import { getOrganizationContext } from '@/lib/actions/organizations'
import { OrgSwitcher } from '@/components/org/OrgSwitcher'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await getOrganizationContext()

  return (
    <OrganizationProvider 
      initialOrg={orgContext?.currentOrg || null} 
      allOrgs={orgContext?.allOrgs || []}
      userRole={orgContext?.userRole || null}
    >
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-[1001]">
          <OrgSwitcher />
        </header>
        <SyncManager />
        <main className="p-4 space-y-4">
          {children}
        </main>
        <MobileNav />
      </div>
    </OrganizationProvider>
  )
}
