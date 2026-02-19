import { BuyerForm } from '@/components/agent/buyers/new/BuyerForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBuyerPage() {
  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-2 px-1">
        <Link href="/agent/buyers" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">Add New Buyer</h2>
      </div>
      
      <BuyerForm />
    </div>
  )
}
