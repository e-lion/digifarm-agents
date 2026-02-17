'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginView } from '@/components/auth/LoginView'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return <LoginView error={error} />
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
