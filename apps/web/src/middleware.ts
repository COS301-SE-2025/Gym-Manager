import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('authToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.startsWith('/error') ||
    pathname === '' ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/landing'
  ) {
    return NextResponse.next();
  }

  // Allow non-protected routes to proceed normally
  if (!protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(
        new URL(
          `/error?error=auth&message=${encodeURIComponent('Please login first')}`,
          request.url,
        ),
      );
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp && payload.exp < Date.now() / 1000;

      if (isExpired) {
        if (refreshToken) {
          // Allow through; the client will refresh on first request
          return NextResponse.next();
        }
        const response = NextResponse.redirect(
          new URL(
            `/error?error=session&message=${encodeURIComponent('Session expired')}`,
            request.url,
          ),
        );
        response.cookies.delete('authToken');
        return response;
      }
    } catch {
      const response = NextResponse.redirect(
        new URL(
          `/error?error=session&message=${encodeURIComponent('Invalid session')}`,
          request.url,
        ),
      );
      response.cookies.delete('authToken');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
