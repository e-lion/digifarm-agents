'use client'

import dynamic from 'next/dynamic'

export const RadiusEditor = dynamic(() => import('./RadiusEditor'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 flex items-center justify-center animate-pulse rounded-xl text-gray-400 text-xs">Loading Map...</div>
})
