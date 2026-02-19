'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Users, ShieldCheck, Calendar, MapPin, CheckCircle, Clock, Mail, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toggleAccess, addAgent } from '@/lib/actions/users'

interface UnifiedUser {
  email: string
  role: string
  status: 'activated' | 'deactivated'
  fullName: string | null
  isRegistered: boolean
}

interface Visit {
    id: string
    buyer_name: string
    status: string
    scheduled_date: string
    completed_at: string | null
    checked_in_at: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

interface AgentsViewProps {
  agentsWithMetrics: AgentMetrics[]
  unifiedUsers: UnifiedUser[]
  startDate: string
  endDate: string
}

export function AgentsView({ agentsWithMetrics, unifiedUsers, startDate, endDate }: AgentsViewProps) {
  const [activeTab, setActiveTab] = useState<'performance' | 'access'>('performance')
  const [isAdding, setIsAdding] = useState(false)
  
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <Card className="w-full md:w-96">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Add New User / Whitelist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form 
                            action={async (formData) => {
                                setIsAdding(true)
                                try {
                                    await addAgent(formData)
                                } catch (e) {
                                    console.error(e)
                                } finally {
                                    setIsAdding(false)
                                }
                            }} 
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input 
                                        name="email" 
                                        type="email" 
                                        placeholder="agent@digifarm.com" 
                                        required 
                                        className="pl-11 h-12 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Assign Role</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors z-10">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                        <select 
                                            name="role" 
                                            defaultValue="agent"
                                            className="flex h-12 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:bg-white transition-all duration-200 appearance-none cursor-pointer"
                                        >
                                            <option value="agent">Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-green-600 transition-colors">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isAdding} className="h-12 px-6 shadow-sm">
                                        {isAdding ? (
                                            <Clock className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                <span>Add User</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Access Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registration</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {unifiedUsers.map((user) => (
                                    <tr key={user.email} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{user.fullName || 'Pending Registration'}</span>
                                                <span className="text-xs text-gray-500">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                             <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                user.isRegistered ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {user.isRegistered ? 'Registered' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                user.status === 'activated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button 
                                                variant={user.status === 'activated' ? 'outline' : 'primary'}
                                                size="sm"
                                                onClick={() => toggleAccess(user.email, user.status)}
                                                className={user.status === 'activated' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                                            >
                                                {user.status === 'activated' ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {unifiedUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-sm text-gray-500">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  )
}
