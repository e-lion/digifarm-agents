import { LucideLoader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <LucideLoader2 className="h-10 w-10 text-green-600 animate-spin" />
      <p className="text-sm font-medium text-gray-500 animate-pulse">Loading data...</p>
    </div>
  )
}
