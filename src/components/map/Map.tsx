'use client'

import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Fix for default marker icons in Next.js
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

interface MapProps {
  center?: [number, number]
  zoom?: number
  polygons?: { id: string; coords: [number, number][]; color?: string; name?: string }[]
  markers?: { id: string; position: [number, number]; popup?: string }[]
  className?: string
  hideLocate?: boolean
  bounds?: [number, number][] | null
  autoLocate?: boolean
}

function MapUpdater({ center, zoom, bounds }: { center: [number, number]; zoom: number; bounds?: [number, number][] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
        // Create a LatLngBounds object from the points
        const latLngBounds = L.latLngBounds(bounds.map(c => L.latLng(c[0], c[1])))
        if (latLngBounds.isValid()) {
            map.fitBounds(latLngBounds, { padding: [50, 50] })
            return
        }
    }
    // Fallback to center/zoom if no valid bounds
    map.setView(center, zoom)
  }, [center, zoom, bounds, map])
  return null
}

function LocateControl() {
  const map = useMap()
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    
    console.log("Starting localization via Leaflet...")

    const onLocationFound = (le: L.LocationEvent) => {
      console.log("Location found:", le.latlng)
      setPosition([le.latlng.lat, le.latlng.lng])
      setLoading(false)
      map.off('locationfound', onLocationFound)
      map.off('locationerror', onLocationError)
    }

    const onLocationError = (err: L.ErrorEvent) => {
      console.warn("Leaflet locate failed, trying native fallback...", err)
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords
            setPosition([latitude, longitude])
            map.flyTo([latitude, longitude], 16)
            setLoading(false)
          },
          (nativeErr) => {
            console.error("Native fallback failed:", nativeErr)
            alert(`Location Unavailable: ${nativeErr.message}. Please ensure Location Services are enabled on your Mac/Browser.`)
            setLoading(false)
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        )
      } else {
        alert("Geolocation not supported.")
        setLoading(false)
      }
      map.off('locationfound', onLocationFound)
      map.off('locationerror', onLocationError)
    }

    map.on('locationfound', onLocationFound)
    map.on('locationerror', onLocationError)

    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: false, // More reliable on some browsers
      timeout: 10000
    })
  }

  return (
    <>
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control leaflet-bar">
          <button 
            className="bg-white hover:bg-gray-100 text-gray-800 font-semibold p-2 border border-gray-400 rounded shadow flex items-center justify-center"
            onClick={handleLocate}
            title="Locate Me"
            type="button"
            disabled={loading}
            style={{ width: '34px', height: '34px', cursor: 'pointer' }}
          >
            {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></span>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="22" y1="12" x2="18" y2="12"></line>
                <line x1="6" y1="12" x2="2" y2="12"></line>
                <line x1="12" y1="6" x2="12" y2="2"></line>
                <line x1="12" y1="22" x2="12" y2="18"></line>
                </svg>
            )}
          </button>
        </div>
      </div>
      {position && <Marker position={position} icon={DefaultIcon}>
        <Popup>You are here</Popup>
      </Marker>}
    </>
  )
}

function AutoLocator({ enabled }: { enabled: boolean }) {
    const map = useMap()
    useEffect(() => {
        if (enabled) {
            console.log("Auto-locating...")
            map.locate({ setView: true, maxZoom: 16 })
        }
    }, [enabled, map])
    return null
}

export default function Map({ 
  center = [-1.2921, 36.8219], 
  zoom = 13, 
  polygons = [], 
  markers = [], 
  className,
  hideLocate = false,
  bounds,
  autoLocate = false
}: MapProps) {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={false} 
      className={className} 
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} bounds={bounds} />
      <AutoLocator enabled={autoLocate} />
      {!hideLocate && <LocateControl />}
      {polygons.map((poly) => (
        <Polygon key={poly.id} positions={poly.coords} pathOptions={{ color: poly.color || 'blue' }}>
           {poly.name && <Popup>{poly.name}</Popup>}
        </Polygon>
      ))}
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position}>
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  )
}
