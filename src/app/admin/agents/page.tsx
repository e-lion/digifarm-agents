import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { AgentsView } from './AgentsView'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

// Helper to parse PostGIS Geography point (can be WKT string, GeoJSON object, or EWKB hex)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parsePoint = (pt: any) => {
  if (!pt) return null
  
  if (typeof pt === 'object') {
    if (pt.type === 'Point' && Array.isArray(pt.coordinates)) {
      return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
    }
    if (pt.coordinates && Array.isArray(pt.coordinates)) {
      return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
    }
  }

  if (typeof pt === 'string' && pt.startsWith('POINT(')) {
    const match = pt.match(/\((.*)\)/)
    if (match) {
      const parts = match[1].trim().split(/\s+/)
      if (parts.length >= 2) {
        const [lng, lat] = parts.map(Number)
        return { lat, lng }
      }
    }
  }
  
  // HEX EWKB string
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
      
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng }
      }
    } catch (e) {
      console.error("EWKB Parse Error:", e)
    }
  }
  
  return null
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const supabase = await createClient()
  const params = await searchParams
  
  // Default date range: beginning of current week (Sunday) to end of current week (Saturday)
  const now = new Date()
  
  const dayOfWeek = now.getDay()
  
  const beginningOfWeek = new Date(now)
  beginningOfWeek.setDate(now.getDate() - dayOfWeek)
  const defaultStartDate = beginningOfWeek.toISOString().split('T')[0]

  const endOfWeek = new Date(beginningOfWeek)
  endOfWeek.setDate(beginningOfWeek.getDate() + 6)
  const defaultEndDate = endOfWeek.toISOString().split('T')[0]

  const startDate = params.startDate || defaultStartDate
  const endDate = params.endDate || defaultEndDate

  // Get current user to exclude self
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('*, visits(*, buyers(location_lat, location_lng))')
    .neq('id', user?.id) // Exclude current user
    .order('full_name', { ascending: true })

  const allProfiles = allProfilesData || []
  // Filter for performance view (allows 'agent' AND null roles)
  const agentProfiles = allProfiles.filter(p => p.role !== 'admin')

  console.log('DEBUG: allProfilesData count:', allProfilesData?.length || 0)
  // Calculate metrics for the selected date range
  const agentsWithMetrics = Array.isArray(agentProfiles) ? agentProfiles.map(agent => {
    // Filter visits for the selected date range
    const visits = Array.isArray(agent?.visits) ? agent.visits : []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyVisits = visits.filter((v: any) => {
        if (!v?.scheduled_date) return false
        try {
            const visitDate = new Date(v.scheduled_date).toISOString().split('T')[0]
            return visitDate >= startDate && visitDate <= endDate
        } catch (e) {
            console.error('Error parsing date for visit:', v?.id, e)
            return false
        }
    })

    const totalVisits = dailyVisits.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedVisits = dailyVisits.filter((v: any) => v?.status === 'completed').length
    
    let verifiedVisitsCount = 0;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitsWithVerification = dailyVisits.map((v: any) => {
        let isLocationVerified = false;
        const parsedCheckIn = parsePoint(v?.check_in_location);
        
        if (v?.status === 'completed' && parsedCheckIn) {
            // Extract buyer location
            const buyerData = Array.isArray(v.buyers) ? v.buyers[0] : v.buyers;
            if (buyerData?.location_lat && buyerData?.location_lng) {
                try {
                    const from = point([parsedCheckIn.lng, parsedCheckIn.lat]);
                    const to = point([buyerData.location_lng, buyerData.location_lat]);
                    const dist = distance(from, to, { units: 'kilometers' });
                    
                    if (dist <= 0.1) { // 100 meters
                        isLocationVerified = true;
                        verifiedVisitsCount++;
                    }
                } catch (e) {
                    console.error("Geo check error on server", e);
                }
            } else {
                // If the buyer has no recorded location, maybe we don't count it as strictly 
                // "verified" within a range, or perhaps we just treat the check-in itself as verified.
                // Let's hold strictly to: Verified = Check-in matches Buyer Location. 
                // If they have no buyer location, they can't be distance verified.
                // Alternatively, count it if there is a check-in and no buyer location. 
                // For now, let's keep it strict or default to old behavior if no buyer location:
                // If you want strict: leave isLocationVerified = false.
            }
        }
        
        return {
            ...v,
            isLocationVerified,
            parsedCheckIn,
            buyerLocation: Array.isArray(v.buyers) ? v.buyers[0] : v.buyers
        };
    });

    const verifiedVisits = verifiedVisitsCount;
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0
    
    return {
      ...agent,
      totalVisits,
      completedVisits,
      verifiedVisits,
      completionRate,
      visits: visitsWithVerification
    }
  }) : []

  console.log('DEBUG: Final agentsWithMetrics count:', agentsWithMetrics?.length || 0)

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Agent Performance</h2>
           <p className="text-gray-500">Overview of agent planned vs actual visits</p>
        </div>
      </div>

      <AgentsView 
        agentsWithMetrics={agentsWithMetrics || []} 
        startDate={startDate}
        endDate={endDate}
      />
    </AdminLayout>
  )
}
