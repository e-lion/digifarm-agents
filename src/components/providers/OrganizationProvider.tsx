'use client'

import { createContext, useContext, ReactNode, useState } from 'react'
import { switchOrganization } from '@/lib/actions/organizations'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationContextType {
  currentOrg: Organization | null
  allOrgs: Organization[]
  isPending: boolean
  switchOrg: (orgId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({
  children,
  initialOrg,
  allOrgs
}: {
  children: ReactNode
  initialOrg: Organization | null
  allOrgs: Organization[]
}) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(initialOrg)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg?.id) return
    
    setIsPending(true)
    try {
      await switchOrganization(orgId)
      const newOrg = allOrgs.find(o => o.id === orgId) || null
      setCurrentOrg(newOrg)
      toast.success(`Switched to ${newOrg?.name}`)
      router.refresh()
    } catch (error) {
      toast.error('Failed to switch organization')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <OrganizationContext.Provider value={{ currentOrg, allOrgs, isPending, switchOrg: handleSwitch }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
