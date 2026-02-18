import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { revalidatePath } from 'next/cache'
import { AgentsView } from './AgentsView'

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const supabase = await createClient()
  const params = await searchParams
  
  // Default to today if no date provided
  const today = new Date().toISOString().split('T')[0]
  const startDate = params.startDate || today
  const endDate = params.endDate || today

  // Get current user to exclude self
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*, visits(*)')
    .neq('id', user?.id) // Exclude current user
    .order('full_name', { ascending: true })

  // Filter out admins (allows 'agent' AND null roles)
  const agentProfiles = allProfiles?.filter(p => p.role !== 'admin') || []

  // Fetch whitelisted emails
  const { data: agents } = await supabase
    .from('profile_access')
    .select('*')
    .eq('role', 'agent')
    .order('created_at', { ascending: false })

  async function addAgent(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    if (!email) return

    const supabase = await createClient()
    const { error } = await supabase.from('profile_access').insert({ email, role: 'agent' })
    
    if (error) {
        console.error('Failed to add agent:', error)
        // In a real app, return extraction to show toast
    } else {
        revalidatePath('/admin/agents')
    }
  }

  // Calculate metrics for the selected date range
  const agentsWithMetrics = agentProfiles.map(agent => {
    // Filter visits for the selected date range
    const visits = agent.visits || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyVisits = visits.filter((v: any) => {
        if (!v.scheduled_date) return false
        try {
            const visitDate = new Date(v.scheduled_date).toISOString().split('T')[0]
            return visitDate >= startDate && visitDate <= endDate
        } catch (e) {
            console.error('Error parsing date for visit:', v.id, e)
            return false
        }
    })

    const totalVisits = dailyVisits.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedVisits = dailyVisits.filter((v: any) => v.status === 'completed').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifiedVisits = dailyVisits.filter((v: any) => v.status === 'completed' && v.check_in_location).length
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0
    
    return {
      ...agent,
      totalVisits,
      completedVisits,
      verifiedVisits,
      completionRate,
      visits: dailyVisits
    }
  })

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Agent Performance</h2>
           <p className="text-gray-500">Overview of agent planned vs actual visits</p>
        </div>
      </div>

      <AgentsView 
        agentsWithMetrics={agentsWithMetrics} 
        whitelistedAgents={agents || []} 
        addAgentAction={addAgent}
        startDate={startDate}
        endDate={endDate}
      />
    </AdminLayout>
  )
}
