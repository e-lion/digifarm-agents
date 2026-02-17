import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { revalidatePath } from 'next/cache'
import { AgentsView } from './AgentsView'

export default async function AgentsPage() {
  const supabase = await createClient()
  
  // Get current user to exclude self
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch actual agents and their Stats
  const { data: agentStats } = await supabase
    .from('profiles')
    .select('*, visits(status)')
    .neq('role', 'admin') // Fetch everyone except admins
    .neq('id', user?.id) // Exclude current user (admin) even if role is null
    .order('full_name', { ascending: true })

  // Fetch whitelisted emails (moved back)
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

  // Calculate metrics
  const agentsWithMetrics = agentStats?.map(agent => {
    const totalVisits = agent.visits.length
    const completedVisits = agent.visits.filter((v: any) => v.status === 'completed').length
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0
    
    return {
      ...agent,
      totalVisits,
      completedVisits,
      completionRate
    }
  }) || []

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Agent Management</h2>
           <p className="text-gray-500">Overview of agent access and performance</p>
        </div>
      </div>

      <AgentsView 
        agentsWithMetrics={agentsWithMetrics} 
        whitelistedAgents={agents || []} 
        addAgentAction={addAgent} 
      />
    </AdminLayout>
  )
}
