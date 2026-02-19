'use client'

import { useEffect, useState } from 'react'
import { getBuyersList, BuyerOption, getBuyerTypes, getValueChains, getContactDesignations } from '@/lib/actions/buyers'
import { getActivityTypes } from '@/lib/actions/visits'
import CreateVisitForm from './CreateVisitForm'
import { Loader2 } from 'lucide-react'

export default function NewVisitPage() {
  const [buyers, setBuyers] = useState<BuyerOption[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buyerTypes, setBuyerTypes] = useState<string[]>([])
  const [valueChains, setValueChains] = useState<string[]>([])
  const [activityTypes, setActivityTypes] = useState<string[]>([])
  const [contactDesignations, setContactDesignations] = useState<string[]>([])

  useEffect(() => {
    async function init() {
        if (navigator.onLine) {
            try {
                const [buyersResult, typesResult, valueChainsResult, activityTypesResult, designationsResult] = await Promise.all([
                  getBuyersList(),
                  getBuyerTypes(),
                  getValueChains(),
                  getActivityTypes(),
                  getContactDesignations()
                ])
                setBuyers(buyersResult.data)
                setTotalCount(buyersResult.count)
                setBuyerTypes(typesResult)
                setValueChains(valueChainsResult)
                setActivityTypes(activityTypesResult)
                setContactDesignations(designationsResult)
            } catch (e) {
                console.error("Failed to load initial data", e)
            }
        }
        setLoading(false)
    }
    init()
  }, [])

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">Loading...</p>
        </div>
      )
  }
  
  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Create Route Plan</h2>
        <p className="text-sm text-gray-500">Plan visits for multiple buyers at once</p>
      </div>
      <CreateVisitForm 
        existingBuyers={buyers} 
        totalBuyersCount={totalCount} 
        buyerTypes={buyerTypes} 
        valueChains={valueChains}
        activityTypes={activityTypes}
        contactDesignations={contactDesignations}
      />
    </>
  )
}
