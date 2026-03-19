import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const getUrl = (path: string) => {
    const url = new URL(path, request.url)
    if (url.hostname !== 'localhost' && !url.hostname.includes('127.0.0.1')) {
      url.protocol = 'https:'
    }
    return url
  }

  // Define public paths
  const isAuthPath = path.startsWith('/auth/login') || path.startsWith('/auth/callback') || path.startsWith('/api/auth') || path === '/'
  const isSetupPath = path.startsWith('/org-setup')
  const isOnboardingPath = path.startsWith('/onboarding')

  // 1. Unauthenticated users
  if (!user) {
    if (!isAuthPath && !isSetupPath && !isOnboardingPath) {
      return NextResponse.redirect(getUrl('/'))
    }
    return response
  }

  // 2. Authenticated users
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, phone_number, last_organization_id')
    .eq('id', user.id)
    .single()

  // 2a. No organization assigned? Redirect to setup (unless already there or public)
  if (!profile?.last_organization_id && !isSetupPath && !isAuthPath) {
    return NextResponse.redirect(getUrl('/org-setup'))
  }

  // 2b. If already has org, don't let them stay on org-setup
  if (profile?.last_organization_id && isSetupPath) {
    return NextResponse.redirect(getUrl('/'))
  }

  // 2c. Legacy redirection logic (Login/Root)
  if (isAuthPath) {
    if (profile?.role === 'admin') {
      return NextResponse.redirect(getUrl('/admin/dashboard'))
    }
    return NextResponse.redirect(getUrl('/agent/routes'))
  }

  // 2d. Role-based agent onboarding
  if (profile?.role === 'agent' && (!profile.first_name || !profile.last_name || !profile.phone_number)) {
    if (!isOnboardingPath) {
      return NextResponse.redirect(getUrl('/onboarding'))
    }
    return response
  }

  // 2e. Role-based path protection
  if (path.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(getUrl('/agent/routes'))
  }
  if (path.startsWith('/agent') && profile?.role === 'admin') {
    return NextResponse.redirect(getUrl('/admin/dashboard'))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
