'use client'

import VisitPage from '../[id]/page'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function DraftWrapper() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  
  // Wrap the existing [id] page behavior but force it into draft mode
  // The id is passed via search params, but we need to mock the "params" expected by the [id] page
  const mockedParams = Promise.resolve({ id: id as string })

  if (!id) {
    return <div className="p-8 text-center text-red-500">No draft ID provided</div>
  }

  return <VisitPage params={mockedParams} />
}

export default function OfflineDraftPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">Preparing offline draft...</p>
        </div>
    }>
      <DraftWrapper />
    </Suspense>
  )
}
