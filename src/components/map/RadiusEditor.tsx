'use client'

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'

// Fix icons
const iconUrl = '/marker-icon.png?v=1'
const iconRetinaUrl = '/marker-icon-2x.png?v=1'
const shadowUrl = '/marker-shadow.png?v=1'

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

interface RadiusEditorProps {
  onChange: (coords: [number, number] | null) => void
  value?: [number, number] | null
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMapEvents({})
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom())
    }
  }, [center, map])
  return null
}

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)
  
  const map = useMapEvents({
    click: onClick
  })

  // ... rest of MapEvents same as before ...
  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    
    map.locate({ setView: true, maxZoom: 16 })
      .once("locationfound", (ev) => {
        const { lat, lng } = ev.latlng
        setUserLoc([lat, lng])
        setLoading(false)
      })
      .once("locationerror", (err) => {
        console.warn("Leaflet locate failed, trying native...", err)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            setUserLoc([latitude, longitude])
            map.flyTo([latitude, longitude], 16)
            setLoading(false)
          },
          (err2) => {
            console.error("Native locate failed:", err2)
            setLoading(false)
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        )
      })
  }

  const containerRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      L.DomEvent.disableClickPropagation(ref)
      L.DomEvent.disableScrollPropagation(ref)
    }
  }

  return (
    <>
      {userLoc && <Marker position={userLoc} opacity={0.5} />}
      <div 
        ref={containerRef}
        className="leaflet-bottom leaflet-right" 
        style={{ pointerEvents: 'auto', marginBottom: '22px', marginRight: '10px', zIndex: 1000 }}
      >
        <div className="leaflet-control leaflet-bar border-none shadow-none">
          <button 
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold p-2 rounded-xl shadow-lg border border-gray-200 flex items-center justify-center transition-all active:scale-95"
            onClick={handleLocate}
            title="Locate Me"
            type="button"
            disabled={loading}
            style={{ width: '42px', height: '42px', cursor: 'pointer' }}
          >
            {loading ? (
                <span className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></span>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                  <line x1="12" y1="2" x2="12" y2="4"></line>
                  <line x1="12" y1="20" x2="12" y2="22"></line>
                  <line x1="2" y1="12" x2="4" y2="12"></line>
                  <line x1="20" y1="12" x2="22" y2="12"></line>
                </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default function RadiusEditor({ onChange, value }: RadiusEditorProps) {
  const [point, setPoint] = useState<[number, number] | null>(value || null)

  useEffect(() => {
    if (value) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPoint(value)
    }
  }, [value])

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng]
    setPoint(newPoint)
    onChange(newPoint)
  }

  return (
    <div className="relative h-[400px] w-full border rounded-xl overflow-hidden shadow-inner mb-8 md:mb-0">
      <MapContainer 
        center={[-1.2921, 36.8219]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onClick={handleMapClick} />
        <MapUpdater center={point} />
        
        {point && (
          <>
            <Marker position={point} />
            <Circle 
              center={point} 
              radius={100} 
              pathOptions={{ 
                color: '#16a34a', 
                fillColor: '#16a34a', 
                fillOpacity: 0.2,
                weight: 2
              }} 
            />
          </>
        )}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[400] bg-white/95 p-3 rounded-xl shadow-lg border border-gray-100 text-xs font-medium text-gray-700">
        📍 Tap to drop a pin. A 100m radius will be set.
      </div>
    </div>
  )
}
