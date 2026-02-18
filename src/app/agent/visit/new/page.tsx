'use client'

import { useEffect, useState } from 'react'
import { getBuyersList, BuyerOption } from '@/lib/actions/buyers'
import CreateVisitForm from './CreateVisitForm'
import { Loader2 } from 'lucide-react'

export default function NewVisitPage() {
  const [buyers, setBuyers] = useState<BuyerOption[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
        if (navigator.onLine) {
            try {
                const { data, count } = await getBuyersList()
                setBuyers(data)
                setTotalCount(count)
            } catch (e) {
                console.error("Failed to load initial buyers", e)
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
        <h2 className="text-xl font-bold text-gray-900">Plan New Visit</h2>
        <p className="text-sm text-gray-500">Define the buyer and location</p>
      </div>
      <CreateVisitForm existingBuyers={buyers} totalBuyersCount={totalCount} />
    </>
  )
}
