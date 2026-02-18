import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import DynamicMap from '@/components/map/DynamicMap' // Direct import, DynamicMap handles ssr: false internally

export default async function GlobalMapPage() {
  const supabase = await createClient()

  const { data: visits } = await supabase
    .from('visits')
    .select('id, buyer_name, polygon_coords, check_in_location, status, agent_id, profiles(full_name)')
  
  // Transform for map
  const polygons = visits?.filter(v => v.polygon_coords).map(v => ({
    id: v.id,
    // GeoJSON is LngLat, Leaflet is LatLng
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coords: v.polygon_coords.coordinates[0].map((c: any) => [c[1], c[0]]), 
    color: v.status === 'completed' ? 'green' : 'blue',
    // @ts-expect-error type inference from profiles is tricky
    name: `${v.buyer_name} (${v.profiles?.full_name || (Array.isArray(v.profiles) ? v.profiles[0]?.full_name : null) || 'Assigned'})`
  })) || []

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
                polygons={polygons} 
                className="h-full w-full"
                center={[-1.2921, 36.8219]}
                zoom={11}
             />
        </div>
      </div>
    </AdminLayout>
  )
}
