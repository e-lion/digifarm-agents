'use client'

import { VisitDetails } from '@/components/visit/VisitDetails'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const VisitDetailsWrapper = () => {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  if (!id) {
    return <div className="p-8 text-center text-red-500">No visit ID provided</div>
  }

  // Directly use the refactored component logic
  return <VisitDetails id={id} />
}

export default function VisitDetailsPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">Loading visit details...</p>
        </div>
    }>
      <VisitDetailsWrapper />
    </Suspense>
  )
}
