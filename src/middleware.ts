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

  // Public paths
  if (path.startsWith('/auth/login') || path.startsWith('/api/auth') || path === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, phone_number, status')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'deactivated') {
        return NextResponse.redirect(new URL('/auth/login?error=DeactivatedAccount', request.url))
      }

      if (profile?.role === 'agent' && (!profile.first_name || !profile.last_name || !profile.phone_number)) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/agent/routes', request.url))
    }
    return response
  }

  // Onboarding path
  if (path.startsWith('/onboarding')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Protected paths
  if (!user && (path.startsWith('/admin') || path.startsWith('/agent'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Role-based path protection
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, phone_number, status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'deactivated') {
      return NextResponse.redirect(new URL('/auth/login?error=DeactivatedAccount', request.url))
    }

    if (profile?.role === 'agent' && (!profile.first_name || !profile.last_name || !profile.phone_number)) {
       return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (path.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/agent/routes', request.url))
    }
    if (path.startsWith('/agent') && profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - generally public or handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
