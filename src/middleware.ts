import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Maintain a list of allowed origins
const allowedOrigins = [
  'https://addressd.webflow.io',
  'https://addressd.vercel.app',
  'http://localhost:3000',
  // Add customer domains here or fetch from database
];

// Helper to validate origin
const isValidOrigin = (origin: string | null) => {
  if (!origin) return false;
  
  // Check if it's an exact match
  if (allowedOrigins.includes(origin)) return true;
  
  // Check if it's a customer subdomain (example.com)
  const customerDomainPattern = /^https:\/\/[a-zA-Z0-9-]+\.example\.com$/;
  if (customerDomainPattern.test(origin)) return true;

  return false;
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    // Return early if origin is not allowed
    if (!isValidOrigin(origin)) {
      return new NextResponse(null, { status: 403 });
    }

    const headers = {
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400', // 24 hours
    };

    return new NextResponse(null, { 
      status: 200,
      headers,
    });
  }

  // Handle actual requests
  if (origin) {
    if (isValidOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      // Log unauthorized attempt
      console.warn(`Unauthorized API access attempt from origin: ${origin}`);
      return new NextResponse(null, { 
        status: 403,
        statusText: 'Forbidden: Origin not allowed'
      });
    }
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  return response;
}

// Configure which paths should be processed
export const config = {
  matcher: [
    '/api/:path*',
    // Add other paths that need CORS protection
  ],
}; 