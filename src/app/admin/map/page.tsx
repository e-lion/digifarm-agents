import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    coords: v.polygon_coords.coordinates[0].map((c: any) => [c[1], c[0]]), 
    color: v.status === 'completed' ? 'green' : 'blue',
    // @ts-ignore - Supabase types join inference can be tricky without generated types
    name: `${v.buyer_name} (${v.profiles?.full_name || v.profiles?.[0]?.full_name || 'Assigned'})`
  })) || []

  // Add markers for completed check-ins
  // Note: PostGIS point handling needs parsing, simplification for now:
  // Assuming we might store it as simple JSON or parse the WKT/GeoJSON
  // For this demo, let's skip complex WKT parsing unless we installed a library for it (like wellknown)
  // We'll rely on polygons for now.

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        <div className="mb-4">
            <h2 className="text-xl font-bold">Global Visit Map</h2>
        </div>
        <div className="flex-1 min-h-[500px] border border-gray-300 rounded-xl overflow-hidden shadow-sm">
             <DynamicMap 
                polygons={polygons} 
                className="h-full w-full"
                center={[-1.2921, 36.8219]}
             />
        </div>
      </div>
    </AdminLayout>
  )
}
