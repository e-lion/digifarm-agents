import { BuyerList } from '@/components/agent/buyers/BuyerList'

export default function AgentBuyersPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 px-1 pt-2">My Buyers</h2>
      <BuyerList />
    </div>
  )
}
