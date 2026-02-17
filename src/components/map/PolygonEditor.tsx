'use client'

import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Trash2, Check } from 'lucide-react'

// Fix icons
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface PolygonEditorProps {
  onChange: (coords: [number, number][]) => void
}

// Internal component to handle map events and location
function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  
  const map = useMapEvents({
     click: onClick
  })

  // Center map on user location on load
  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setUserLoc([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, map.getZoom())
    })
  }, [map])

  // Custom button added via standard React instead of Leaflet Control for easier styling match
  return (
    <>
       {userLoc && <Marker position={userLoc} icon={DefaultIcon} opacity={0.6} />}
       <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'auto', marginBottom: '20px', marginLeft: '10px', zIndex: 1000 }}>
          <div className="leaflet-control leaflet-bar">
            <a 
              className="bg-white hover:bg-gray-100 text-gray-800 font-semibold p-2 border border-gray-400 rounded shadow flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                
                console.log("Manual locate triggered...")
                map.locate({ setView: true, enableHighAccuracy: false, timeout: 10000 })
                  .once("locationfound", (ev) => {
                    setUserLoc([ev.latlng.lat, ev.latlng.lng])
                    map.flyTo(ev.latlng, map.getZoom())
                  })
                  .once("locationerror", (err) => {
                    console.warn("Manual locate failed, trying native...", err)
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude, longitude } = pos.coords
                        setUserLoc([latitude, longitude])
                        map.flyTo([latitude, longitude], map.getZoom())
                      },
                      (err2) => alert(`Unable to find location: ${err2.message}. Ensure GPS/Location is enabled.`),
                      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
                    )
                  })
              }}
              title="Locate Me"
              style={{ width: '34px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="22" y1="12" x2="18" y2="12"></line>
                <line x1="6" y1="12" x2="2" y2="12"></line>
                <line x1="12" y1="6" x2="12" y2="2"></line>
                <line x1="12" y1="22" x2="12" y2="18"></line>
              </svg>
            </a>
          </div>
       </div>
    </>
  )
}

export default function PolygonEditor({ onChange }: PolygonEditorProps) {
  const [points, setPoints] = useState<[number, number][]>([])

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng]
    const newPoints = [...points, newPoint]
    setPoints(newPoints)
    onChange(newPoints)
  }

  const reset = () => {
    setPoints([])
    onChange([])
  }

  const undo = () => {
    const newPoints = points.slice(0, -1)
    setPoints(newPoints)
    onChange(newPoints)
  }

  return (
    <div className="relative h-[400px] w-full border rounded-lg overflow-hidden">
      <MapContainer 
        center={[-1.2921, 36.8219]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onClick={handleMapClick} />
        
        {points.map((p, idx) => (
          <Marker key={idx} position={p} />
        ))}
        
        {points.length > 2 && (
          <Polygon positions={points} pathOptions={{ color: 'green' }} />
        )}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[400] flex gap-2">
        <Button size="sm" variant="secondary" onClick={undo} disabled={points.length === 0} type="button">
           Undo
        </Button>
        <Button size="sm" variant="danger" onClick={reset} disabled={points.length === 0} type="button">
           <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute top-4 left-4 z-[400] bg-white/90 p-2 rounded-md shadow text-xs">
        Tap map to add points for the area.
      </div>
    </div>
  )
}
