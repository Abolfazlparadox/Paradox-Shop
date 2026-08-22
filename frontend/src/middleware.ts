import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const authCookie = request.cookies.get('pdx_auth_token')?.value;
    const isStaffCookie = request.cookies.get('pdx_is_staff')?.value;

    // Edge check: If auth cookies exist and declare staff status
    // Client-side AdminAuthGuard will perform secondary cryptographical validation
    const hasStaffFlag = isStaffCookie === 'true' || authCookie;

    // If completely absent on server-side navigation, redirect to admin login
    if (!hasStaffFlag) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
