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

  // Use getUser() instead of getSession() for security, as it verifies with the server
  // This is the only network call in the middleware now.
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

  // 1. Unauthenticated users
  // Public paths: /auth/login, /auth/callback, /api/auth, /
  const isPublicPath = path.startsWith('/auth/login') || path.startsWith('/auth/callback') || path.startsWith('/api/auth') || path === '/'
  const isSetupPath = path.startsWith('/org-setup')
  const isOnboardingPath = path.startsWith('/agent/onboarding')

  if (!user) {
    if (isSetupPath || isOnboardingPath) {
      return NextResponse.redirect(getUrl('/auth/login'))
    }
    if (!isPublicPath) {
      return NextResponse.redirect(getUrl('/'))
    }
    return response
  }

  // 2. Authenticated users - Basic redirection logic
  // We avoid querying the database for the profile here to save compute.
  // Role-based protection (Admin vs Agent) is now handled at the Layout level
  // using a cached profile fetch.

  // Root landing logic (Send to / if they are logged in, app/page.tsx will handle the rest)
  // Or we can let it pass through and let app/page.tsx handle roles.
  if (path === '/') {
    return response // app/page.tsx handles the specific role-based redirect
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
     * - manifest.json (PWA manifest)
     * - images in public folder (png, jpg, svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
