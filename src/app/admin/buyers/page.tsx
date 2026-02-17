import { Suspense } from 'react'
import { getBuyers } from '@/lib/actions/buyers'
import BuyersTable from '@/components/admin/BuyersTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Users2, AlertCircle } from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1
  const itemsPerPage = typeof resolvedParams.size === 'string' ? parseInt(resolvedParams.size) : 8
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : ''

  const { buyers, totalCount, error } = await getBuyers(page, itemsPerPage, search)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Registered Buyers</h2>
            <p className="text-gray-500">Manage and view all buyers in the system.</p>
          </div>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>Error loading buyers: {error}</p>
            </CardContent>
          </Card>
        ) : (
          <Suspense fallback={<p>Loading buyers...</p>}>
              <BuyersTable 
                buyers={buyers} 
                totalCount={totalCount}
                currentPage={page}
                itemsPerPage={itemsPerPage}
                currentSearch={search}
              />
          </Suspense>
        )}
      </div>
    </AdminLayout>
  )
}
