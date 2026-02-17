'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Card, CardContent } from '@/components/ui/Card'
import { RadiusEditor } from '@/components/map/DynamicRadiusEditor'
import circle from '@turf/circle'
import { point } from '@turf/helpers'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

export default function CreateVisitForm() {
  const [loading, setLoading] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null)
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

    if (!selectedPoint) {
      alert('Please drop a pin to define the area')
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

    // Convert point [lat, lng] to 100m radius circle polygon
    // turf circle uses [lng, lat]
    const center = point([selectedPoint[1], selectedPoint[0]])
    const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })

    const { error } = await supabase.from('visits').insert({
      agent_id: user.id,
      buyer_name: buyerName,
      scheduled_date: date,
      status: 'planned',
      polygon_coords: circularPolygon.geometry
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
          
          <div className="relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">Value Chains</label>
             <SearchableSelect 
               options={KENYAN_VALUE_CHAINS} 
               value={valueChain} 
               onChange={setValueChain} 
               placeholder="Search value chains..."
             />
             <input type="hidden" name="value_chain" value={valueChain} />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
             <div className="relative group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-500 transition-colors pointer-events-none">
                 <Calendar className="h-4 w-4" />
               </div>
               <Input 
                name="date" 
                type="date" 
                required 
                min={new Date().toISOString().split('T')[0]}
                onClick={(e) => (e.target as any).showPicker?.()}
                className="pl-11 h-12 rounded-xl border-2 border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all duration-200 cursor-pointer [appearance:none] [&::-webkit-calendar-picker-indicator]:hidden"
               />
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
           <label className="block text-sm font-medium text-gray-700 mb-2">Location Center (100m Radius)</label>
           <RadiusEditor onChange={setSelectedPoint} />
           <p className="text-xs text-gray-500 mt-2">Tap the map to set the center. A 100m radius will automaticallly be applied.</p>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" isLoading={loading}>
        Create Visit Plan
      </Button>
    </form>
  )
}
