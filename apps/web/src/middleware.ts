import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('authToken')?.value;

  // Skip error page, login, and public routes
  if (pathname.startsWith('/error') || pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }

  if (!protectedRoutes.includes(pathname)) {
    return NextResponse.redirect(
      new URL(`/error?error=404&message=${encodeURIComponent('Page not found')}`, request.url),
    );
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
