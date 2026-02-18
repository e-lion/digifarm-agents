'use client'

import { use } from 'react'
import { VisitDetails } from '@/components/visit/VisitDetails'

export default function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <VisitDetails id={id} />
}
