import { RouteList } from '@/components/agent/RouteList'

export default function RoutesPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Your Routes</h2>
      </div>

      <RouteList />
    </>
  )
}
