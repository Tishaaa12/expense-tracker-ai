import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isProtectedApiRoute = pathname.startsWith('/api') && !isApiAuthRoute;
  const isProtectedPage = pathname === '/' || pathname.startsWith('/expenses');

  if (token) {
    const payload = await verifyToken(token);

    if (!payload) {
      if (isProtectedPage) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
      }
      if (isProtectedApiRoute) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        response.cookies.delete('token');
        return response;
      }
    } else {
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      if (isProtectedApiRoute) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.userId);
        requestHeaders.set('x-user-email', payload.email);
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }
  } else {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/expenses/:path*',
    '/api/:path*',
  ],
};
