'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(
  () => import('./Map'),
  { 
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>,
    ssr: false 
  }
)

export default function DynamicMap(props: any) {
  return <Map {...props} />
}
