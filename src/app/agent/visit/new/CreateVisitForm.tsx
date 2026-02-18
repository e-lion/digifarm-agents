'use client'

import { useState, useEffect } from 'react'
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
import { createVisitAction } from '@/lib/actions/visits'
import { BuyerOption, getBuyersList } from '@/lib/actions/buyers' 
import { saveOfflineNewVisit } from '@/lib/offline-storage'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

export default function CreateVisitForm({ existingBuyers = [], totalBuyersCount = 0 }: { existingBuyers?: BuyerOption[], totalBuyersCount?: number }) {
  const [loading, setLoading] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null)
  const router = useRouter()
  
  const [valueChain, setValueChain] = useState("")
  const [buyerType, setBuyerType] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [selectedBuyerId, setSelectedBuyerId] = useState("")

  const KENYAN_VALUE_CHAINS = [
    "Maize", "Tea", "Coffee", "Dairy", "Sugarcane", "Potatoes", "Beans", 
    "Bananas", "Rice", "Wheat", "Sorghum", "Millet", "Avocado", "Mangoes", 
    "Macadamia", "Cashew Nuts", "Pyrethrum", "Cotton", "Sunflower", "Soya Beans",
    "Tomatoes", "Onions", "Cabbages", "Kales (Sukuma Wiki)", "Poultry", "Goats/Sheep"
  ]

  const BUYER_TYPES = ['Aggregator', 'Processor', 'Exporter', 'Input Supplier', 'Cooperative']
  
  const COUNTIES = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos', 'Nyeri', 'Meru', 'Kakamega' 
  ]
  
  const [county, setCounty] = useState("")

  const [buyerOptions, setBuyerOptions] = useState<BuyerOption[]>(existingBuyers)
  const [totalOptionsCount, setTotalOptionsCount] = useState(totalBuyersCount)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (searchTerm) {
            setIsSearching(true)
            try {
                const { data: results, count } = await getBuyersList(searchTerm)
                setBuyerOptions(results)
                setTotalOptionsCount(count)
            } catch (e) {
                console.error("Failed to search buyers", e)
            } finally {
                setIsSearching(false)
            }
        } else {
            // Reset to initial list if search is cleared
            setBuyerOptions(existingBuyers)
            setTotalOptionsCount(totalBuyersCount)
        }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, existingBuyers])

  const handleBuyerSelect = (name: string) => {
    const buyer = buyerOptions.find(b => b.name === name)
    if (buyer) {
        setBuyerName(buyer.name)
        setBuyerType(buyer.business_type || "")
        setValueChain(buyer.value_chain || "")
        setCounty(buyer.county || "")
        setSelectedBuyerId(buyer.id)
        if (buyer.location) {
            setSelectedPoint([buyer.location.lat, buyer.location.lng])
        }
    } else {
        // Clear logic if needed, or just set name
        setBuyerName(name)
        setSelectedBuyerId("")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    // buyerName is now in state
    const date = formData.get('date') as string

    if (!buyerName) {
        alert('Please enter or select a buyer name')
        setLoading(false)
        return
    }

    if (!valueChain) {
        alert('Please select a value chain')
        setLoading(false)
        return
    }


    if (!buyerType) {
        alert('Please select a buyer type')
        setLoading(false)
        return
    }

    if (!county) {
        alert('Please select a county')
        setLoading(false)
        return
    }



    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.user) {
        alert('You must be logged in')
        setLoading(false)
        return
    }
    const user = session.user

    // Convert point [lat, lng] to 100m radius circle polygon
    // turf circle uses [lng, lat]
    let polygonGeometry = null
    
    if (selectedPoint) {
        const center = point([selectedPoint[1], selectedPoint[0]])
        const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })
        polygonGeometry = circularPolygon.geometry
    }

    const payload = {
      buyer_name: buyerName,
      buyer_type: buyerType,
      value_chain: valueChain,
      county: county,
      scheduled_date: date,
      polygon_coords: polygonGeometry
    }

    if (!navigator.onLine) {
       // Save offline
       const tempId = uuidv4()
       await saveOfflineNewVisit({
         ...payload,
         id: tempId,
         status: 'planned',
         isDraft: true, // Marked as local draft
         agent_id: user.id,
         created_at: new Date().toISOString()
       })
       toast.success("Visit plan saved locally 📡. It will sync when you're back online.")
       router.push('/agent/routes')
       setLoading(false)
       return
    }

    const result = await createVisitAction(payload)

    if (result.error) {
      console.error(result.error)
      toast.error(result.error)
    } else {
      router.push('/agent/routes')
      toast.success("Visit plan created successfully! ⚡")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          
          {/* Select Previous Buyer */}
           <div className="relative z-20">
             <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Buyer (Optional)</label>
             <SearchableSelect 
               options={buyerOptions.map(b => b.name)} 
               value={selectedBuyerId ? buyerName : ""} 
               onChange={handleBuyerSelect} 
               onSearch={setSearchTerm}
               placeholder="Search previous buyers..."
               totalCount={totalOptionsCount}
             />
             <p className="text-xs text-gray-500 mt-1">Selecting a buyer will auto-fill the details below.</p>
           </div>

           <div className="relative bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-green-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">Buyer Details</h3>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                <Input 
                    name="buyer_name" 
                    required 
                    placeholder="e.g. Upcountry Millers" 
                    value={buyerName}
                    disabled={!!selectedBuyerId}
                    onChange={(e) => {
                        setBuyerName(e.target.value)
                        // If user types manually, clear selected ID to treat as new/custom interaction
                        if (selectedBuyerId && e.target.value !== buyerName) {
                            setSelectedBuyerId("")
                        }
                    }}
                />
             </div>

          <div className="relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Type</label>
             <SearchableSelect 
               options={BUYER_TYPES} 
               value={buyerType} 
               onChange={setBuyerType} 
               placeholder="Search buyer types..."
               disabled={!!selectedBuyerId}
             />
          </div>
          
          <div className="relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">Value Chains</label>
             <SearchableSelect 
               options={KENYAN_VALUE_CHAINS} 
               value={valueChain} 
               onChange={setValueChain} 
               placeholder="Search value chains..."
               disabled={!!selectedBuyerId}
             />
             <input type="hidden" name="value_chain" value={valueChain} />
          </div>

          <div className="relative">
             <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
             <SearchableSelect 
               options={COUNTIES} 
               value={county} 
               onChange={setCounty} 
               placeholder="Search counties..."
               disabled={!!selectedBuyerId}
             />
          </div>
           </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
             <div className="relative group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-500 transition-colors pointer-events-none">
                 <Calendar className="h-4 w-4" />
               </div>
               <Input 
                name="date" 
                type="datetime-local" 
                required 
                min={new Date().toISOString().slice(0, 16)}
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
           <RadiusEditor onChange={setSelectedPoint} value={selectedPoint} />
           <p className="text-xs text-gray-500 mt-2">Tap the map to set the center. A 100m radius will automaticallly be applied.</p>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" isLoading={loading}>
        Create Visit Plan
      </Button>
    </form>
  )
}
