import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'
import { revalidatePath } from 'next/cache'

export default async function AgentsPage() {
  const supabase = await createClient()
  
  // Fetch actual agents and their Stats
  const { data: agentStats } = await supabase
    .from('profiles')
    .select('*, visits(status)')
    .eq('role', 'agent')
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

      <div className="space-y-8">
        {/* Performance Section */}
        <Card>
            <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {agentsWithMetrics.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {agentsWithMetrics.map((agent) => (
                                <div key={agent.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{agent.full_name || 'Unknown Agent'}</h3>
                                            <p className="text-xs text-gray-500">{agent.email}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            agent.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                                            agent.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {agent.completionRate}% Done
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <span>Progress</span>
                                            <span className="font-medium">{agent.completedVisits} / {agent.totalVisits} Visits</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    agent.completionRate >= 80 ? 'bg-green-500' :
                                                    agent.completionRate >= 50 ? 'bg-yellow-500' :
                                                    'bg-blue-500'
                                                }`}
                                                style={{ width: `${agent.completionRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p>No active agents found with profiles.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Add New Agent</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={addAgent} className="flex gap-2">
                <Input name="email" type="email" placeholder="agent@example.com" required className="flex-1" />
                <Button type="submit">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                </Button>
                </form>
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Whitelisted Emails</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {agents?.map((agent) => (
                            <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-sm font-medium">{agent.email}</span>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Whitelisted</span>
                            </div>
                        ))}
                        {agents?.length === 0 && <p className="text-sm text-gray-500">No agents whitelisted yet.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
