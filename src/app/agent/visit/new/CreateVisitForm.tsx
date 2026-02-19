'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Card, CardContent } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Plus, X, Trash2 } from 'lucide-react'
import { createBulkVisits } from '@/lib/actions/visits'
import { BuyerOption, getBuyersList } from '@/lib/actions/buyers' 
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VisitItem {
  buyerId: string
  buyerName: string
  activityType: string
  scheduleDate: string
  visitCategory: 'First Time' | 'Repeat'
}

export default function CreateVisitForm({ 
  existingBuyers = [], 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalBuyersCount = 0,
  activityTypes = [],
}: { 
  existingBuyers?: BuyerOption[], 
  totalBuyersCount?: number,
  buyerTypes?: string[],
  valueChains?: string[],
  activityTypes?: string[],
  contactDesignations?: string[]
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  // State for the list of visits being planned
  const [visits, setVisits] = useState<VisitItem[]>([])
  
  // State for the "Add Buyer" search input
  const [buyerOptions, setBuyerOptions] = useState<BuyerOption[]>(existingBuyers)
  const [searchTerm, setSearchTerm] = useState("")

  // Debounce search for buyers
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (searchTerm) {
            try {
                const { data: results } = await getBuyersList(searchTerm)
                setBuyerOptions(results)
            } catch (e) {
                console.error("Failed to search buyers", e)
            }
        } else {
            setBuyerOptions(existingBuyers)
        }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, existingBuyers])

  const handleAddBuyer = (buyerId: string) => {
      const buyer = buyerOptions.find(b => b.id === buyerId)
      if (!buyer) return

      // Prevent duplicates
      if (visits.some(v => v.buyerId === buyerId)) {
          toast.error(`${buyer.name} is already in the list`)
          // setSelectedBuyerIdToAdd("") // Reset selection if we had a controlled input for it
          return
      }

      // Add to list with default or empty values
      setVisits(prev => [{
          buyerId: buyer.id,
          buyerName: buyer.name,
          activityType: "",
          scheduleDate: "",
          visitCategory: 'First Time'
      }, ...prev])

      toast.success(`Added ${buyer.name} to route`)
  }

  const updateVisit = (index: number, field: keyof VisitItem, value: string) => {
      setVisits(prev => {
          const newVisits = [...prev]
          newVisits[index] = { ...newVisits[index], [field]: value }
          return newVisits
      })
  }

  const removeVisit = (index: number) => {
      setVisits(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (visits.length === 0) {
        toast.error('Please add at least one buyer to the route')
        setLoading(false)
        return
    }

    // Validation
    const invalidVisit = visits.find(v => !v.activityType || !v.scheduleDate)
    if (invalidVisit) {
        toast.error(`Please complete details for ${invalidVisit.buyerName}`)
        setLoading(false)
        return
    }

    // Check online status
    if (!navigator.onLine) {
        toast.error("You are offline. Route planning requires an internet connection.")
        setLoading(false)
        return
    }

    try {
        const payload = visits.map(v => ({
            buyer_id: v.buyerId,
            activity_type: v.activityType,
            scheduled_date: v.scheduleDate,
            visit_category: v.visitCategory
        }))

        const result: { error?: string; success?: boolean; count?: number } = await createBulkVisits(payload)

        if (result.error) {
            console.error(result.error)
            toast.error(result.error)
        } else {
            router.push('/agent/routes')
            toast.success(`Route plan created with ${visits.length} stops! 🚀`)
        }
    } catch (e) {
        console.error("Submission error:", e)
        toast.error("Failed to create route plan")
    } finally {
        setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      
      {/* 1. Add Buyer Section */}
      <Card className="border-green-100 shadow-sm overflow-visible">
        <CardContent className="pt-6">
           <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Plus className="h-5 w-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Add Buyer to Route</h3>
                    <p className="text-xs text-gray-500">Search and select a buyer to add them to your plan.</p>
                </div>
           </div>

           <div className="relative z-20">
             <SearchableSelect 
               options={buyerOptions.map(b => b.name)} 
               value="" // Always empty to allow re-selection
               // We need a way to map the selected NAME back to ID for handleAddBuyer
               // SearchableSelect creates a combo box of strings. 
               // We can modify handleAddBuyer to take name and lookup ID, or pass a custom onChange that finds the ID.
               onChange={(name) => {
                   const buyer = buyerOptions.find(b => b.name === name)
                   if (buyer) handleAddBuyer(buyer.id)
               }} 
               onSearch={setSearchTerm}
               placeholder="Search to add buyer..."
             />
           </div>
        </CardContent>
      </Card>

      {/* 2. List of Visits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <div className="h-6 w-1 bg-green-500 rounded-full"></div>
                Route Stops ({visits.length})
            </h3>
            {visits.length > 0 && (
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setVisits([])}
                    className="border-none bg-transparent text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    Clear All
                </Button>
            )}
        </div>

        {visits.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No buyers added yet</p>
                <p className="text-sm text-gray-400">Search above to start building your route</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {visits.map((visit, index) => (
                    <Card key={`${visit.buyerId}-${index}`} className="border-l-4 border-l-green-500 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CardContent className="p-4 pt-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                
                                {/* Header / Remove Button Mobile */}
                                <div className="flex items-start justify-between md:hidden">
                                    <div className="font-semibold text-gray-900 bg-gray-50 px-3 py-1 rounded-full text-sm inline-block">
                                        {index + 1}. {visit.buyerName}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => removeVisit(index)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Desktop Index/Name */}
                                <div className="hidden md:flex items-center gap-3 w-1/4 shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="font-semibold text-gray-900 truncate" title={visit.buyerName}>
                                        {visit.buyerName}
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                         <label className="text-[10px] uppercase font-bold text-gray-400 md:hidden">Activity</label>
                                         <SearchableSelect 
                                            options={activityTypes} 
                                            value={visit.activityType} 
                                            onChange={(val) => updateVisit(index, 'activityType', val)} 
                                            placeholder="Activity..."
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-400 md:hidden">Details</label>
                                        <div className="flex gap-2">
                                            {/* Date Time Picker */}
                                            <div className="relative flex-1">
                                                <Input 
                                                    type="datetime-local" 
                                                    value={visit.scheduleDate}
                                                    onChange={(e) => updateVisit(index, 'scheduleDate', e.target.value)}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    onClick={(e) => (e.target as any).showPicker?.()}
                                                    className="pl-3 h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors cursor-pointer text-sm w-full"
                                                />
                                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                            </div>

                                            {/* Visit Category Toggle */}
                                            <div className="flex rounded-lg bg-gray-100 p-1 h-10 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => updateVisit(index, 'visitCategory', 'First Time')}
                                                    className={cn(
                                                        "px-3 text-xs font-medium rounded-md transition-all",
                                                        visit.visitCategory === 'First Time' 
                                                            ? "bg-white text-green-700 shadow-sm" 
                                                            : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    1st
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateVisit(index, 'visitCategory', 'Repeat')}
                                                    className={cn(
                                                        "px-3 text-xs font-medium rounded-md transition-all",
                                                        visit.visitCategory === 'Repeat' 
                                                            ? "bg-white text-blue-700 shadow-sm" 
                                                            : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    Rpt
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Remove */}
                                <div className="hidden md:flex items-center justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeVisit(index)}
                                        className="border-none bg-transparent text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full h-10 w-10"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>

      <div className="sticky bottom-4 md:static pt-4 z-30">
        <Button 
            type="submit" 
            className={cn(
                "w-full h-14 text-lg font-bold shadow-xl transition-all duration-300",
                visits.length > 0 ? "bg-green-600 hover:bg-green-700 shadow-green-900/20 translate-y-0" : "bg-gray-300 cursor-not-allowed translate-y-2 opacity-50"
            )} 
            disabled={visits.length === 0}
            isLoading={loading}
        >
            Create Route Plan ({visits.length})
        </Button>
      </div>
    </form>
  )
}
