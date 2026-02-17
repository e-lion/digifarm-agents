'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Card, CardContent } from '@/components/ui/Card'
import { PolygonEditor } from '@/components/map/DynamicPolygonEditor'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreateVisitForm() {
  const [loading, setLoading] = useState(false)
  const [polygon, setPolygon] = useState<[number, number][]>([])
  const router = useRouter()
  
  const [valueChain, setValueChain] = useState("")

  const KENYAN_VALUE_CHAINS = [
    "Maize", "Tea", "Coffee", "Dairy", "Sugarcane", "Potatoes", "Beans", 
    "Bananas", "Rice", "Wheat", "Sorghum", "Millet", "Avocado", "Mangoes", 
    "Macadamia", "Cashew Nuts", "Pyrethrum", "Cotton", "Sunflower", "Soya Beans",
    "Tomatoes", "Onions", "Cabbages", "Kales (Sukuma Wiki)", "Poultry", "Goats/Sheep"
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const buyerName = formData.get('buyer_name') as string
    const date = formData.get('date') as string

    if (!valueChain) {
        alert('Please select a value chain')
        setLoading(false)
        return
    }

    if (polygon.length < 3) {
      alert('Please define a valid area (at least 3 points)')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        alert('You must be logged in')
        setLoading(false)
        return
    }

    // GeoJSON polygon format: [[[lng, lat], [lng, lat], ...]] (closed loop)
    // Leaflet gives [lat, lng]
    const coordinates = polygon.map(p => [p[1], p[0]])
    // Close the loop
    coordinates.push(coordinates[0])

    const { error } = await supabase.from('visits').insert({
      agent_id: user.id,
      buyer_name: buyerName,
      scheduled_date: date,
      status: 'planned',
      polygon_coords: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    })

    if (error) {
      console.error(error)
      alert('Failed to create visit')
    } else {
      router.push('/agent/routes')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
             <Input name="buyer_name" required placeholder="e.g. Upcountry Millers" />
          </div>
          
          <div className="z-50 relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">Value Chain</label>
             <SearchableSelect 
               options={KENYAN_VALUE_CHAINS} 
               value={valueChain} 
               onChange={setValueChain} 
               placeholder="Search crops..."
             />
             <input type="hidden" name="value_chain" value={valueChain} />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
             <Input name="date" type="date" required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
           <label className="block text-sm font-medium text-gray-700 mb-2">Location Area</label>
           <PolygonEditor onChange={setPolygon} />
           <p className="text-xs text-gray-500 mt-2">Tap at least 3 points to define the buyer's area.</p>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" isLoading={loading}>
        Create Visit Plan
      </Button>
    </form>
  )
}
