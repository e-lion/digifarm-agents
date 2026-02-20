import { createClient } from '@/lib/supabase/server'
import Map from '@/components/map/DynamicMap' // Use DynamicMap to avoid SSR issues


export default async function AgentMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: visits } = await supabase
    .from('visits')
    .select('*, buyers(location_lat, location_lng)')
    .eq('agent_id', user?.id)
  
  // Format for the map
  const mapData = visits?.filter(v => (v.buyers as any)?.location_lat).map(v => {
    const b = v.buyers as any
    return {
      marker: {
        id: v.id,
        position: [b.location_lat, b.location_lng] as [number, number],
        popup: v.buyer_name
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
  
  // Collect all points to calculate bounds
  const allPoints = markers.map(m => m.position)
  const hasPolygons = allPoints.length > 0
  
  return (
    <>
      <div className="h-[calc(100vh-180px)] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative z-0">
         <Map 
           markers={markers}
           circles={circles}
           zoom={11}
           className="h-full w-full"
           bounds={hasPolygons ? allPoints : null}
           autoLocate={!hasPolygons}
         />
         
         <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs z-[1000]">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Pending
            </div>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span> Completed
            </div>
         </div>
      </div>
    </>
  )
}
