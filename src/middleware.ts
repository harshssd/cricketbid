import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// Rate limiting store (in production, use Redis or external service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

function getRateLimitKey(request: NextRequest): string {
  // Use IP address as the key, fallback to a default
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  return `ratelimit:${ip}`
}

function checkRateLimit(request: NextRequest, config: RateLimitConfig): boolean {
  const key = getRateLimitKey(request)
  const now = Date.now()
  const windowMs = config.windowMs || 15 * 60 * 1000 // Default: 15 minutes
  const maxRequests = config.maxRequests || 100 // Default: 100 requests

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // New window or expired record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  )

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Remove potentially sensitive headers
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')

  return response
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function isPublicRoute(pathname: string): boolean {
  // Exact-match routes
  if (pathname === '/') return true

  // Prefix-match routes (all subpaths are public)
  const publicPrefixes = [
    '/auth/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/live',
    '/api/health',
    '/api/auth',
  ]

  return publicPrefixes.some(prefix => pathname.startsWith(prefix)) ||
         pathname.includes('/public/') ||
         pathname.includes('/_next/') ||
         pathname.includes('/favicon.ico')
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('/public/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') {
    // Continue without rate limiting in development
  } else {
    // Apply rate limiting only in production
    const rateLimitConfig: RateLimitConfig = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      message: 'Too many requests, please try again later.'
    }

    // More strict rate limiting for API routes
    if (isApiRoute(pathname)) {
      rateLimitConfig.maxRequests = 50 // Lower limit for API routes
      rateLimitConfig.windowMs = 5 * 60 * 1000 // 5 minutes window
    }

    // Even stricter for auth endpoints
    if (pathname.startsWith('/api/auth/')) {
      rateLimitConfig.maxRequests = 10
      rateLimitConfig.windowMs = 15 * 60 * 1000 // 15 minutes
    }

    if (!checkRateLimit(request, rateLimitConfig)) {
      logger.warn('Rate limit exceeded', {
        ip: getRateLimitKey(request),
        path: pathname,
        userAgent: request.headers.get('user-agent')
      })

      return NextResponse.json(
        {
          error: rateLimitConfig.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
        },
        { status: 429 }
      )
    }
  }

  // Skip Supabase middleware if not configured properly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey ||
      supabaseUrl.includes('placeholder') ||
      supabaseAnonKey.includes('placeholder') ||
      supabaseUrl.includes('your-project') ||
      supabaseAnonKey.includes('your-anon-key') ||
      !supabaseUrl.startsWith('http')) {

    // Add security headers even when Supabase is not configured
    supabaseResponse = addSecurityHeaders(supabaseResponse)
    supabaseResponse.headers.set('x-request-id', crypto.randomUUID())

    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Get user for auth validation
    const { data: { user }, error } = await supabase.auth.getUser()

    // Authentication check for protected routes
    if (!isPublicRoute(pathname) && (error || !user)) {
      logger.warn('Unauthorized access attempt', {
        path: pathname,
        ip: getRateLimitKey(request),
        userAgent: request.headers.get('user-agent')
      })

      // Redirect to sign-in for protected pages
      if (!isApiRoute(pathname)) {
        const loginUrl = new URL('/auth/signin', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 }
      )
    }

    // Forward user info as request headers for all API routes (when user is authenticated)
    if (isApiRoute(pathname) && user) {
      request.headers.set('x-user-id', user.id)
      request.headers.set('x-user-email', user.email || '')

      const newResponse = NextResponse.next({ request })

      // Preserve Supabase auth cookies on the response
      supabaseResponse.cookies.getAll().forEach(cookie => {
        newResponse.cookies.set(cookie)
      })

      supabaseResponse = newResponse
    }

    // refreshing the auth token
    await supabase.auth.getUser()
  } catch (error) {
    logger.error('Supabase middleware error', error as Error, {
      path: pathname,
      ip: getRateLimitKey(request)
    })
  }

  // Add security headers
  supabaseResponse = addSecurityHeaders(supabaseResponse)

  // Add request ID and timing headers
  const requestId = crypto.randomUUID()
  const duration = Date.now() - startTime

  supabaseResponse.headers.set('x-request-id', requestId)
  supabaseResponse.headers.set('x-response-time', `${duration}ms`)

  // CORS handling for API routes
  if (isApiRoute(pathname)) {
    const origin = request.headers.get('origin')
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    ]

    if (origin && allowedOrigins.includes(origin)) {
      supabaseResponse.headers.set('Access-Control-Allow-Origin', origin)
      supabaseResponse.headers.set('Access-Control-Allow-Credentials', 'true')
      supabaseResponse.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      )
      supabaseResponse.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control'
      )
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: supabaseResponse.headers })
    }
  }

  // Log request for monitoring
  if (isApiRoute(pathname)) {
    logger.apiRequest(
      request.method,
      pathname,
      request.headers.get('x-user-id') || undefined,
      duration
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}