import { VisitDetails } from '@/components/visit/VisitDetails'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <VisitDetails id={id} isAdmin={true} />
      </div>
    </AdminLayout>
  )
}
