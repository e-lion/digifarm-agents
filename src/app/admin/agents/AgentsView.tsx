'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Users, ShieldCheck, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Visit {
    id: string
    buyer_name: string
    status: string
    scheduled_date: string
    completed_at: string | null
    checked_in_at: string | null
    check_in_location: any
}

interface AgentMetrics {
  id: string
  full_name: string | null
  email: string
  totalVisits: number
  completedVisits: number
  verifiedVisits: number
  completionRate: number
  visits: Visit[]
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
  startDate: string
  endDate: string
}

export function AgentsView({ agentsWithMetrics, whitelistedAgents, addAgentAction, startDate, endDate }: AgentsViewProps) {
  const [activeTab, setActiveTab] = useState<'performance' | 'access'>('performance')
  const [selectedAgentVisits, setSelectedAgentVisits] = useState<{name: string, visits: Visit[]} | null>(null)
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const params = new URLSearchParams(searchParams)
    if (type === 'start') params.set('startDate', value)
    if (type === 'end') params.set('endDate', value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleExport = () => {
    const headers = ['Agent Name', 'Email', 'Total Visits', 'Completed Visits', 'Verified Visits', 'Completion Rate']
    const rows = agentsWithMetrics.map(agent => [
      agent.full_name || 'Unknown',
      agent.email,
      agent.totalVisits,
      agent.completedVisits,
      agent.verifiedVisits,
      `${agent.completionRate}%`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `agent_performance_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
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

          {/* Date Picker & Export */}
          {activeTab === 'performance' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-500">From:</span>
                      <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => handleDateChange('start', e.target.value)}
                          className="text-base border-none focus:ring-0 p-0 text-gray-700 w-32"
                      />
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-500">To:</span>
                      <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => handleDateChange('end', e.target.value)}
                          className="text-base border-none focus:ring-0 p-0 text-gray-700 w-32"
                      />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    className="ml-auto sm:ml-0"
                  >
                    Export CSV
                  </Button>
              </div>
          )}
      </div>

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle>Daily Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <div className="space-y-4">
                    {agentsWithMetrics.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {agentsWithMetrics.map((agent) => (
                                <div key={agent.id} className="group flex flex-col p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                    <div className="flex justify-between items-start mb-4">
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
                                    
                                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                        <div className="bg-gray-50 p-2 rounded-lg">
                                            <span className="block text-xs text-gray-500 uppercase">Planned</span>
                                            <span className="text-lg font-bold text-gray-900">{agent.totalVisits}</span>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <span className="block text-xs text-blue-500 uppercase">Done</span>
                                            <span className="text-lg font-bold text-blue-700">{agent.completedVisits}</span>
                                        </div>
                                        <div className="bg-green-50 p-2 rounded-lg">
                                            <span className="block text-xs text-green-500 uppercase">Verified</span>
                                            <span className="text-lg font-bold text-green-700">{agent.verifiedVisits}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
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

                                    <div className="mt-auto pt-2 border-t border-gray-50">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button 
                                                    className="w-full text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 py-1"
                                                >
                                                    View Visits
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Visit Log: {agent.full_name || 'Unknown Agent'}</DialogTitle>
                                                    <DialogDescription>
                                                        Details of visits from {startDate} to {endDate}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                
                                                <div className="mt-4 space-y-3">
                                                    {agent.visits && agent.visits.length > 0 ? (
                                                        agent.visits.map((visit) => (
                                                            <div key={visit.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="font-semibold text-gray-900">{visit.buyer_name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {visit.status === 'completed' ? (
                                                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                                                <CheckCircle className="h-3 w-3" /> Done
                                                                            </span>
                                                                        ) : (
                                                                             <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                                                                                <Clock className="h-3 w-3" /> Pending
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="text-xs text-gray-500 space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <span>Completed At:</span>
                                                                        <span className="font-mono">
                                                                            {visit.completed_at ? new Date(visit.completed_at).toLocaleTimeString() : '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span>Check-in:</span>
                                                                        <span className="font-mono">
                                                                            {visit.checked_in_at ? new Date(visit.checked_in_at).toLocaleTimeString() : '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-2">
                                                                        <span>Location Verified:</span>
                                                                        {visit.check_in_location ? (
                                                                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                                                                <MapPin className="h-3 w-3" /> Yes
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1 text-gray-400">
                                                                                <MapPin className="h-3 w-3" /> No
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-500">
                                                            <p>No visits scheduled for this date.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
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
