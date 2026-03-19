import { redirect } from 'next/navigation'
import { LoginView } from '@/components/auth/LoginView'
import { getProfile } from '@/lib/auth/get-profile'

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { user, profile } = await getProfile()

  if (user) {
    if (profile?.role === 'admin') {
      redirect('/admin/dashboard')
    } else {
      redirect('/agent/routes')
    }
  }

  const resolvedParams = await searchParams
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null

  return <LoginView error={error} />
}
