import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    supabase: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    memory?: {
      used: number
      total: number
      percentage: number
    }
  }
  dependencies?: {
    [key: string]: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
  }
}

async function checkDatabase(): Promise<HealthCheck['checks']['database']> {
  const start = Date.now()

  try {
    // Simple query to test database connectivity
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start

    return {
      status: 'up',
      responseTime
    }
  } catch (error) {
    logger.error('Database health check failed', error as Error)
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkSupabase(): Promise<HealthCheck['checks']['supabase']> {
  const start = Date.now()

  try {
    const supabase = await createClient()
    // Test Supabase connectivity by fetching session
    await supabase.auth.getSession()
    const responseTime = Date.now() - start

    return {
      status: 'up',
      responseTime
    }
  } catch (error) {
    logger.error('Supabase health check failed', error as Error)
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Supabase error'
    }
  }
}

function getMemoryUsage(): HealthCheck['checks']['memory'] {
  const memoryUsage = process.memoryUsage()
  const totalMemory = memoryUsage.heapTotal
  const usedMemory = memoryUsage.heapUsed
  const percentage = (usedMemory / totalMemory) * 100

  return {
    used: Math.round(usedMemory / 1024 / 1024 * 100) / 100, // MB
    total: Math.round(totalMemory / 1024 / 1024 * 100) / 100, // MB
    percentage: Math.round(percentage * 100) / 100
  }
}

// Basic health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    const includeMemory = searchParams.get('memory') === 'true'

    // Basic health data
    const healthData: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: { status: 'up' },
        supabase: { status: 'up' },
        ...(includeMemory || detailed ? { memory: getMemoryUsage() } : {})
      }
    }

    // Perform detailed checks if requested
    if (detailed) {
      logger.info('Performing detailed health check')

      // Run checks in parallel
      const [databaseCheck, supabaseCheck] = await Promise.all([
        checkDatabase(),
        checkSupabase()
      ])

      healthData.checks.database = databaseCheck
      healthData.checks.supabase = supabaseCheck

      // Determine overall status based on checks (exclude memory which doesn't have status)
      const hasDown = [healthData.checks.database, healthData.checks.supabase].some(
        check => check.status === 'down'
      )

      if (hasDown) {
        healthData.status = 'unhealthy'
      } else {
        // Check if any service is slow (>1000ms)
        const hasSlow = [databaseCheck, supabaseCheck].some(
          check => check.responseTime && check.responseTime > 1000
        )
        healthData.status = hasSlow ? 'degraded' : 'healthy'
      }
    }

    // Memory info is conditionally included above, so no need to remove it

    // Set appropriate HTTP status
    const httpStatus = healthData.status === 'healthy' ? 200 :
                      healthData.status === 'degraded' ? 200 : 503

    // Log health check performance
    const duration = Date.now() - startTime
    logger.info('Health check completed', {
      status: healthData.status,
      duration: `${duration}ms`,
      detailed
    })

    return NextResponse.json(healthData, { status: httpStatus })

  } catch (error) {
    logger.error('Health check failed', error as Error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}

// Liveness probe - minimal check for container orchestration
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}