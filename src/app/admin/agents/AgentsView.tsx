'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Users, ShieldCheck } from 'lucide-react'

interface AgentMetrics {
  id: string
  full_name: string | null
  email: string
  totalVisits: number
  completedVisits: number
  completionRate: number
}

interface WhitelistedAgent {
  id: string
  email: string
  created_at: string
}

interface AgentsViewProps {
  agentsWithMetrics: AgentMetrics[]
  whitelistedAgents: WhitelistedAgent[]
  addAgentAction: (formData: FormData) => Promise<void>
}

export function AgentsView({ agentsWithMetrics, whitelistedAgents, addAgentAction }: AgentsViewProps) {
  const [activeTab, setActiveTab] = useState<'performance' | 'access'>('performance')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'performance' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Performance
          </div>
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'access' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Access Control
          </div>
        </button>
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
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
      )}

      {/* Access Control Tab */}
      {activeTab === 'access' && (
        <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
            <CardHeader>
                <CardTitle>Add New Agent</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={addAgentAction} className="flex gap-2">
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
                        {whitelistedAgents?.map((agent) => (
                            <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-sm font-medium">{agent.email}</span>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Whitelisted</span>
                            </div>
                        ))}
                        {whitelistedAgents.length === 0 && <p className="text-sm text-gray-500">No agents whitelisted yet.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  )
}
