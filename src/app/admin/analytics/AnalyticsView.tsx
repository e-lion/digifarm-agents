'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Users, MapPin, CheckCircle, Activity, Filter } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface Agent {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface Visit {
    id: string
    agent_id: string
    buyer_name: string
    status: string
    scheduled_date: string
    completed_at: string | null
    checked_in_at: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    check_in_location: any
    activity_type: string | null
    visit_category: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buyers?: { location_lat: number, location_lng: number } | any
}

interface AnalyticsViewProps {
  agents: Agent[]
  visits: Visit[]
  startDate: string
  endDate: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B']

export function AnalyticsView({ 
  agents = [], 
  visits = [], 
  startDate, 
  endDate 
}: AnalyticsViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const params = new URLSearchParams(searchParams)
    if (type === 'start') params.set('startDate', value)
    if (type === 'end') params.set('endDate', value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Derived Metrics
  const filteredVisits = useMemo(() => {
     if (selectedAgentId === 'all') return visits;
     return visits.filter(v => v.agent_id === selectedAgentId);
  }, [visits, selectedAgentId]);

  const totalVisits = filteredVisits.length
  const completedVisits = filteredVisits.filter(v => v.status === 'completed').length
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0
  
  // Unique customers
  const uniqueCustomers = useMemo(() => {
      const names = new Set(filteredVisits.map(v => v.buyer_name))
      return names.size
  }, [filteredVisits]);

  // Visit Reasons Data for Chart
  const visitReasonsData = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredVisits.forEach(v => {
          const reason = v.activity_type || v.visit_category || 'Unspecified'
          counts[reason] = (counts[reason] || 0) + 1
      })
      return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
  }, [filteredVisits])
  
  // Calculate average daily visits
  // Dates are YYYY-MM-DD
  const daysDiff = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)));
  const avgDailyVisits = (totalVisits / daysDiff).toFixed(1);
  const avgAgentDailyVisits = selectedAgentId === 'all' && agents.length > 0 
      ? (totalVisits / (daysDiff * agents.length)).toFixed(1)
      : avgDailyVisits;

  // Agent Options for Filter
  const agentOptions = [
      { id: 'all', label: 'All Agents' },
      ...agents.map(a => ({ id: a.id, label: a.full_name || a.email }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          {/* Date Picker & Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto ml-auto">
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select 
                      value={selectedAgentId} 
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="text-sm border-none focus:ring-0 text-gray-700 bg-transparent outline-none"
                  >
                      {agentOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                  </select>
              </div>

              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">From:</span>
                  <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      className="text-sm border-none focus:ring-0 p-0 text-gray-700 w-32 outline-none bg-transparent"
                  />
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                  <span className="text-xs text-gray-500">To:</span>
                  <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="text-sm border-none focus:ring-0 p-0 text-gray-700 w-32 outline-none bg-transparent"
                  />
              </div>
          </div>
      </div>

      <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Visits (Target)</CardTitle>
                        <MapPin className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalVisits}</div>
                        <p className="text-xs text-gray-500 mt-1">Scheduled in this period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Completed Visits</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-bold text-green-600">{completedVisits}</div>
                            <div className="text-sm font-semibold text-gray-400">({completionRate}%)</div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate}%` }} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Unique Customers</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{uniqueCustomers}</div>
                        <p className="text-xs text-gray-500 mt-1">Distinct buyers visited</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Avg Daily Visits/Agent</CardTitle>
                        <Activity className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{avgAgentDailyVisits}</div>
                        <p className="text-xs text-gray-500 mt-1">Over {daysDiff} days</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Visits Context Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={visitReasonsData.slice(0, 5)} // Top 5
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {visitReasonsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="h-[400px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Top Reason Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={visitReasonsData.slice(0, 6)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}
