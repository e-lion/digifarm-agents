import { createClient } from '@/lib/supabase/server'
import Map from '@/components/map/DynamicMap' // Use DynamicMap to avoid SSR issues


export default async function AgentMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: visits } = await supabase
    .from('visits')
    .select('*')
    .eq('agent_id', user?.id)
  
  // Format polygons for the map
  const mapPolygons = visits?.filter(v => v.polygon_coords).map(v => ({
    id: v.id,
    // GeoJSON is LngLat, Leaflet is LatLng. 
    // If stored as GeoJSON { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
    // We need to check the format.
    // Based on PolygonEditor, it returns [lat, lng] arrays?
    // Let's check how it's saved.
    // In VisitForm, `check_in_location` is POINT(lng lat).
    // The polygon comes from `polygon_coords` column.
    // If it's pure standard GeoJSON from PostGIS, it's LngLat. Leaflet wants LatLng.
    // Let's assume standard GeoJSON and swap if needed.
    // For now, let's map assuming the stored format.
    // If using `polygon(targetPolygon.coordinates)` in Turf, it expects GeoJSON.
    
    // Let's safely handle 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coords: v.polygon_coords?.coordinates?.[0]?.map((c: any) => [c[1], c[0]]) || [],
    color: v.status === 'completed' ? 'green' : 'blue',
    name: v.buyer_name
  })) || []

  // Collect all points to calculate bounds
  const allPoints = mapPolygons.flatMap(p => p.coords)
  const hasPolygons = allPoints.length > 0
  
  return (
    <>
      <div className="h-[calc(100vh-180px)] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative z-0">
         <Map 
           polygons={mapPolygons} 
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
