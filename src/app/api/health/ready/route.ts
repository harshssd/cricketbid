import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Readiness probe - checks if the application is ready to serve traffic
export async function GET() {
  const checks: Array<{ name: string; status: 'pass' | 'fail'; error?: string }> = []

  try {
    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.push({ name: 'database', status: 'pass' })
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'fail',
        error: error instanceof Error ? error.message : 'Database connection failed'
      })
    }

    // Check Supabase connectivity
    try {
      const supabase = await createClient()
      await supabase.auth.getSession()
      checks.push({ name: 'supabase', status: 'pass' })
    } catch (error) {
      checks.push({
        name: 'supabase',
        status: 'fail',
        error: error instanceof Error ? error.message : 'Supabase connection failed'
      })
    }

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    if (missingEnvVars.length > 0) {
      checks.push({
        name: 'environment',
        status: 'fail',
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`
      })
    } else {
      checks.push({ name: 'environment', status: 'pass' })
    }

    // Determine overall status
    const allPassed = checks.every(check => check.status === 'pass')
    const httpStatus = allPassed ? 200 : 503

    const response = {
      status: allPassed ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: checks.reduce((acc, check) => {
        acc[check.name] = {
          status: check.status,
          error: check.error
        }
        return acc
      }, {} as Record<string, { status: string; error?: string }>)
    }

    if (!allPassed) {
      logger.warn('Readiness check failed', { checks: response.checks })
    }

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    logger.error('Readiness check error', error as Error)

    return NextResponse.json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}