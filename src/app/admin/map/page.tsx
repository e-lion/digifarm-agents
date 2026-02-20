import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import DynamicMap from '@/components/map/DynamicMap' // Direct import, DynamicMap handles ssr: false internally

export default async function GlobalMapPage() {
  const supabase = await createClient()

  const { data: visits } = await supabase
    .from('visits')
    .select('id, buyer_name, check_in_location, status, agent_id, profiles(full_name), buyers(location_lat, location_lng)')
  
  // Transform for map
  const mapData = visits?.filter(v => (v.buyers as any)?.location_lat).map(v => {
    const b = v.buyers as any
    const agentName = (v.profiles as any)?.full_name || 'Assigned Agent'
    
    return {
      marker: {
        id: v.id,
        position: [b.location_lat, b.location_lng] as [number, number],
        popup: `${v.buyer_name} (${agentName})`
      },
      circle: {
        id: `range-${v.id}`,
        center: [b.location_lat, b.location_lng] as [number, number],
        radius: 100,
        color: v.status === 'completed' ? '#16a34a' : '#2563eb',
        name: `${v.buyer_name} Geofence`
      }
    }
  }) || []

  const markers = mapData.map(d => d.marker)
  const circles = mapData.map(d => d.circle)

  // Add markers for completed check-ins
  // Note: PostGIS point handling needs parsing, simplification for now:
  // Assuming we might store it as simple JSON or parse the WKT/GeoJSON
  // For this demo, let's skip complex WKT parsing unless we installed a library for it (like wellknown)
  // We'll rely on polygons for now.

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-4">
        <div>
            <h2 className="text-xl font-bold">Global Visit Map</h2>
            <p className="text-sm text-gray-500">Overview of all active and completed visits</p>
        </div>
        
        <div className="h-[calc(100vh-220px)] md:h-[calc(100vh-180px)] w-full border border-gray-300 rounded-xl overflow-hidden shadow-sm relative z-0">
             <DynamicMap 
                markers={markers}
                circles={circles}
                className="h-full w-full"
                center={[-1.2921, 36.8219]}
                zoom={11}
             />
        </div>
      </div>
    </AdminLayout>
  )
}
