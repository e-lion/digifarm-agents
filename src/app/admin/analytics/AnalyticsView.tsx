'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Users, MapPin, CheckCircle, Target, Activity, Map as MapIcon, Filter } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import DynamicMap from '@/components/map/DynamicMap'
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
    polygon_coords: any
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'route'>('overview')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')
  const [routeDate, setRouteDate] = useState<string>(endDate)
  
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

  // Repeated Visitors Table Data
  const repeatedVisitors = useMemo(() => {
     const counts: Record<string, { count: number; agents: Set<string>; reasons: Set<string> }> = {}
     filteredVisits.forEach(v => {
         if (!counts[v.buyer_name]) {
             counts[v.buyer_name] = { count: 0, agents: new Set(), reasons: new Set() }
         }
         counts[v.buyer_name].count++
         
         const agent = agents.find(a => a.id === v.agent_id)
         if (agent?.full_name) counts[v.buyer_name].agents.add(agent.full_name)
         
         if (v.activity_type) counts[v.buyer_name].reasons.add(v.activity_type)
     })
     
     return Object.entries(counts)
         .filter(([_, data]) => data.count > 1)
         .map(([name, data]) => ({
             name,
             count: data.count,
             agents: Array.from(data.agents).join(', '),
             reasons: Array.from(data.reasons).join(', ')
         }))
         .sort((a, b) => b.count - a.count)
  }, [filteredVisits, agents]);

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

  // Route map processing
  const routeVisits = useMemo(() => {
     if (selectedAgentId === 'all') return []; // Need a specific agent for sensible routes
     return visits
        .filter(v => v.agent_id === selectedAgentId && v.scheduled_date === routeDate && v.check_in_location)
        .sort((a, b) => {
            const timeA = new Date(a.checked_in_at || a.completed_at || 0).getTime();
            const timeB = new Date(b.checked_in_at || b.completed_at || 0).getTime();
            return timeA - timeB;
        });
  }, [visits, selectedAgentId, routeDate]);

  const routeMarkers = routeVisits.map((v, index) => {
      // check_in_location is assumed to be PostGIS Point [lng, lat] or similar, 
      // Need to extract coordinates. Let's assume standard format for now.
      // If it's a string, we might need to parse. For now assume it's like [lat, lng]
      // Wait, location might be stored as WKB or GeoJSON in Supabase. 
      // Let's use polygon_coords for safe fallback if check_in_location parsing fails.
      
      let position: [number, number] | null = null;
      try {
          if (v.polygon_coords && Array.isArray(v.polygon_coords?.coordinates?.[0])) {
             const coords = v.polygon_coords.coordinates[0][0]; // [lng, lat]
             position = [coords[1], coords[0]];
          }
      } catch (e) {
          console.error(e)
      }

      return position ? {
          id: v.id,
          position,
          popup: `<strong>Stop ${index + 1}</strong><br/>Customer: ${v.buyer_name}<br/>Time: ${v.checked_in_at ? new Date(v.checked_in_at).toLocaleTimeString() : 'N/A'}<br/>Activity: ${v.activity_type || 'N/A'}`
      } : null;
  }).filter(Boolean) as { id: string, position: [number, number], popup: string }[];

  // Connect the dots for the route polyline
  const routePolylines = routeMarkers.length > 1 ? [{
      id: 'route-line',
      coords: routeMarkers.map(m => m.position),
      color: '#3b82f6' // Blue line
  }] : [];
  
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
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Overview</div>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analysis' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2"><Target className="h-4 w-4" /> Visit Analysis</div>
            </button>
            <button
              onClick={() => setActiveTab('route')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'route' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2"><MapIcon className="h-4 w-4" /> Route Map</div>
            </button>
          </div>

          {/* Date Picker & Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
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

              {activeTab !== 'route' && (
                  <>
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
                  </>
              )}
          </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
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
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
          <div className="space-y-6 animate-in fade-in duration-300">
               <Card>
                    <CardHeader>
                        <CardTitle>Repeated Visitors Alert</CardTitle>
                        <p className="text-sm text-gray-500">Customers visited more than once in this time period.</p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Visits</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Agents</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reasons</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {repeatedVisitors.map((visitor) => (
                                        <tr key={visitor.name} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium text-gray-900">{visitor.name}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center justify-center bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-bold text-xs">
                                                    {visitor.count}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{visitor.agents}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{visitor.reasons}</td>
                                        </tr>
                                    ))}
                                    {repeatedVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                                                No repeat visits found in this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
          </div>
      )}

      {/* Route Tab */}
      {activeTab === 'route' && (
          <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div>
                      <h4 className="font-semibold text-blue-900">Chronological Route Mapper</h4>
                      <p className="text-sm text-blue-700">Select an agent and a specific date to visualize their verified check-ins in order.</p>
                  </div>
                  <div className="flex gap-2">
                       <input 
                              type="date" 
                              value={routeDate}
                              onChange={(e) => setRouteDate(e.target.value)}
                              className="text-sm border-gray-300 rounded-lg p-2 text-gray-700 w-40 outline-none focus:ring-2"
                          />
                  </div>
              </div>

              {selectedAgentId === 'all' ? (
                  <div className="h-[500px] flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                      <div className="text-center space-y-2">
                          <MapPin className="h-8 w-8 text-gray-400 mx-auto" />
                          <p className="text-gray-500 font-medium">Please select a specific agent from the top filter to view their route.</p>
                      </div>
                  </div>
              ) : (
                  <Card className="overflow-hidden border-none shadow-sm h-[600px] flex flex-col relative z-0">
                      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md border border-gray-100">
                          <h4 className="font-bold text-gray-900 text-sm">Route Summary</h4>
                          <p className="text-xs text-gray-600 mt-1">Agent: {agentOptions.find(a => a.id === selectedAgentId)?.label}</p>
                          <p className="text-xs text-gray-600">Date: {routeDate}</p>
                          <p className="text-xs text-blue-600 font-semibold mt-1">{routeMarkers.length} Verified Stops</p>
                      </div>
                      <DynamicMap 
                          markers={routeMarkers} 
                          polylines={routePolylines} 
                          className="h-full w-full"
                          bounds={routeMarkers.length > 0 ? routeMarkers.map(m => m.position) : undefined}
                          center={routeMarkers.length > 0 ? routeMarkers[0].position : [-1.2921, 36.8219]}
                          zoom={11}
                      />
                  </Card>
              )}
          </div>
      )}
    </div>
  )
}
