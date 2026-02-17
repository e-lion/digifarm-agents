'use client'

import dynamic from 'next/dynamic'

// Dynamically import VisitForm because it uses browser APIs (geolocation) and potentially heavy libs
export const VisitForm = dynamic(() => import('@/components/forms/VisitForm'), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading form...</div>,
  ssr: false
})
