'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Users as UsersIcon, MapPin, CheckCircle, Clock, Calendar } from 'lucide-react'
import DynamicMap from '@/components/map/DynamicMap'

interface Profile {
    id: string;
    full_name: string | null;
}

interface Visit {
    id: string;
    buyer_name: string;
    status: string;
    scheduled_date: string;
    agent_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    check_in_location: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buyers?: any;
}

interface DashboardClientProps {
    agents: Profile[];
    initialVisits: Visit[];
    initialStartDate: string;
    initialEndDate: string;
    totalAgentCount: number;
}

// Helper to parse PostGIS Geography point
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parsePoint = (pt: any) => {
  if (!pt) return null
  if (typeof pt === 'object') {
    if (pt.type === 'Point' && Array.isArray(pt.coordinates)) return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
    if (pt.coordinates && Array.isArray(pt.coordinates)) return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
  }
  if (typeof pt === 'string' && pt.startsWith('POINT(')) {
    const match = pt.match(/\((.*)\)/)
    if (match) {
      const parts = match[1].trim().split(/\s+/)
      if (parts.length >= 2) return { lat: Number(parts[1]), lng: Number(parts[0]) }
    }
  }
  // HEX EWKB string fallback
  if (typeof pt === 'string' && /^[0-9A-Fa-f]+$/.test(pt) && pt.length >= 50) {
    try {
      const hexToDouble = (hex: string, le: boolean) => {
        const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
        if (!le) bytes.reverse()
        const view = new DataView(bytes.buffer)
        return view.getFloat64(0, true)
      }
      const isLittleEndian = pt.startsWith('01')
      const lng = hexToDouble(pt.substring(18, 34), isLittleEndian)
      const lat = hexToDouble(pt.substring(34, 50), isLittleEndian)
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    } catch (e) {
      console.error("EWKB Parse Error:", e)
    }
  }
  return null
}

export default function DashboardClient({ agents, initialVisits, initialStartDate, initialEndDate, totalAgentCount }: DashboardClientProps) {
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter visits on the client
  const filteredVisits = useMemo(() => {
    return initialVisits.filter(v => {
      if (!v.scheduled_date) return false;
      const visitDate = new Date(v.scheduled_date).toISOString().split('T')[0];
      const inDateRange = visitDate >= startDate && visitDate <= endDate;
      const matchesAgent = selectedAgentId === 'all' || v.agent_id === selectedAgentId;
      const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'completed' ? ['completed', 'verified'].includes(v.status) : ['planned', 'checked-in'].includes(v.status));
      return inDateRange && matchesAgent && matchesStatus;
    });
  }, [initialVisits, startDate, endDate, selectedAgentId, statusFilter]);

  const completedCount = filteredVisits.filter(v => ['completed', 'verified'].includes(v.status)).length;
  const visitCount = filteredVisits.length;
  const pendingCount = visitCount - completedCount;

  // Process map data
  const mapData = useMemo(() => {
    const markers: any[] = [];
    const circles: any[] = [];
    const polylines: any[] = [];
    const boundsPoints: [number, number][] = [];

    filteredVisits.forEach(v => {
        const buyer = Array.isArray(v.buyers) ? v.buyers[0] : v.buyers;
        const agentName = (v.profiles as any)?.full_name || 'Assigned Agent';
        const parsedCheckIn = parsePoint(v.check_in_location);
        
        let hasBuyerLoc = false;
        let hasCheckIn = !!parsedCheckIn;

        if (buyer?.location_lat && buyer?.location_lng) {
            hasBuyerLoc = true;
            boundsPoints.push([buyer.location_lat, buyer.location_lng]);
            
            // Draw expected buyer zone
            circles.push({
                id: `buyer-${v.id}`,
                center: [buyer.location_lat, buyer.location_lng],
                radius: 100,
                color: ['completed', 'verified'].includes(v.status) ? '#16a34a' : '#2563eb',
                name: `${v.buyer_name} (Buyer Location)`
            });
        }

        if (hasCheckIn && parsedCheckIn) {
            boundsPoints.push([parsedCheckIn.lat, parsedCheckIn.lng]);
            markers.push({
                id: `checkin-${v.id}`,
                position: [parsedCheckIn.lat, parsedCheckIn.lng],
                popup: `Check-in: ${v.buyer_name} by ${agentName}`
            });
        }

        if (hasBuyerLoc && hasCheckIn && parsedCheckIn) {
            polylines.push({
                id: `line-${v.id}`,
                coords: [
                    [buyer.location_lat, buyer.location_lng],
                    [parsedCheckIn.lat, parsedCheckIn.lng]
                ],
                color: ['completed', 'verified'].includes(v.status) ? '#16a34a' : '#94a3b8',
                name: 'Distance from expected'
            });
        }
    });

    const result = {
        markers,
        circles,
        polylines,
        bounds: boundsPoints.length > 0 ? boundsPoints : null
    };
    console.log("DEBUG MapData:", result, "Raw Visits Count:", filteredVisits.length)
    return result;
  }, [filteredVisits]);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <UsersIcon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgentCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visits in Period</CardTitle>
            <MapPin className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Map Section with Filters */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
             <CardTitle>Visit Tracking Map</CardTitle>
             
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <select 
                   value={selectedAgentId}
                   onChange={(e) => setSelectedAgentId(e.target.value)}
                   className="h-10 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 min-w-[200px]"
                >
                    <option value="all">All Agents</option>
                    {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.full_name || 'Unknown Agent'}</option>
                    ))}
                </select>

                <select 
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                   className="h-10 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 min-w-[140px]"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                </select>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm h-10">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">From:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm border-none focus:ring-0 p-0 text-gray-700 w-32"
                    />
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm h-10">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">To:</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm border-none focus:ring-0 p-0 text-gray-700 w-32"
                    />
                </div>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="h-[500px] w-full relative z-0 relative">
               <DynamicMap 
                   markers={mapData.markers}
                   circles={mapData.circles}
                   polylines={mapData.polylines}
                   bounds={mapData.bounds}
                   className="h-full w-full rounded-b-xl"
                   center={[-1.2921, 36.8219]}
                   zoom={11}
               />
               
               <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 text-xs flex flex-col gap-2 pointer-events-none">
                    <div className="font-semibold text-gray-700 mb-1 border-b pb-1">Legend</div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-600/20 border-2 border-blue-600 flex-shrink-0"></div>
                        <span>Buyer Location (Pending Visit)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-600/20 border-2 border-green-600 flex-shrink-0"></div>
                        <span>Buyer Location (Completed Visit)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span>Actual Check-in Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg width="16" height="4" className="flex-shrink-0">
                           <line x1="0" y1="2" x2="16" y2="2" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
                        </svg>
                        <span>Distance from Expected</span>
                    </div>
               </div>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
