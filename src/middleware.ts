import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Get allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://addressd.webflow.io',
  'https://addressd.vercel.app',
  'http://localhost:3000'
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // Always allow the API request if it's from an allowed origin
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

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