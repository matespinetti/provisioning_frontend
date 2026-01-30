import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for route protection
 * Checks for access_token cookie and redirects accordingly
 */
export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Redirect authenticated users away from login page
  if (isPublicRoute && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login page
  if (!isPublicRoute && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
