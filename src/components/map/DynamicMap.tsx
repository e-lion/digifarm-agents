'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

export default function DynamicMap(props: any) {
  const Map = useMemo(() => dynamic(
    () => import('./Map'),
    { 
      loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>,
      ssr: false 
    }
  ), [])

  return <Map {...props} />
}
