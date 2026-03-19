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
    // If we're behind a proxy (like Cloudflare) that's terminating SSL,
    // we want to ensure our redirects are always HTTPS.
    if (url.hostname !== 'localhost' && !url.hostname.includes('127.0.0.1')) {
      url.protocol = 'https:'
    }
    return url
  }

  // Public paths
  if (path.startsWith('/auth/login') || path.startsWith('/api/auth') || path === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, phone_number') // Removed 'status' to be safe
        .eq('id', user.id)
        .single()

      if (profile?.role === 'agent' && (!profile.first_name || !profile.last_name || !profile.phone_number)) {
        return NextResponse.redirect(getUrl('/onboarding'))
      }

      if (profile?.role === 'admin') {
        return NextResponse.redirect(getUrl('/admin/dashboard'))
      }
      return NextResponse.redirect(getUrl('/agent/routes'))
    }
    return response
  }

  // Onboarding path
  if (path.startsWith('/onboarding')) {
    if (!user) {
      return NextResponse.redirect(getUrl('/'))
    }
    return response
  }

  // Protected paths
  if (!user && (path.startsWith('/admin') || path.startsWith('/agent'))) {
    return NextResponse.redirect(getUrl('/'))
  }

  // Role-based path protection
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, phone_number') // Removed 'status' to be safe
      .eq('id', user.id)
      .single()

    if (profile?.role === 'agent' && (!profile.first_name || !profile.last_name || !profile.phone_number)) {
       return NextResponse.redirect(getUrl('/onboarding'))
    }

    if (path.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(getUrl('/agent/routes'))
    }
    if (path.startsWith('/agent') && profile?.role === 'admin') {
      return NextResponse.redirect(getUrl('/admin/dashboard'))
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
