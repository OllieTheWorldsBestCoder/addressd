import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public endpoints that don't require API token
const PUBLIC_ENDPOINTS = [
  '/api/address/validate-frontend',
  '/api/auth/callback',
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set CORS headers for all requests
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 