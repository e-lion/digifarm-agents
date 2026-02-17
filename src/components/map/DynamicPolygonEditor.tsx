'use client'

import dynamic from 'next/dynamic'

export const PolygonEditor = dynamic(() => import('./PolygonEditor'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 flex items-center justify-center">Loading Map...</div>
})
