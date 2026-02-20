import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/monitoring'
import { logger } from '@/lib/logger'
import { withAuth } from '@/middleware/auth'

// Get performance metrics (protected endpoint)
export async function GET(request: NextRequest) {
  return withAuth(request, async (request, user) => {
    try {
      // Only allow access to admin users or in development
      const isDev = process.env.NODE_ENV === 'development'
      const isAdmin = user?.role === 'admin' // Adjust based on your user model

      if (!isDev && !isAdmin) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      const { searchParams } = new URL(request.url)
      const includeErrors = searchParams.get('errors') === 'true'

      const metrics = performanceMonitor.getMetrics()
      const response: any = {
        ...metrics,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV
      }

      if (includeErrors) {
        response.errors = performanceMonitor.getErrors()
      }

      logger.info('Metrics accessed', {
        userId: user?.id,
        includeErrors
      })

      return NextResponse.json(response)

    } catch (error) {
      logger.error('Failed to get metrics', error as Error)
      return NextResponse.json(
        { error: 'Failed to retrieve metrics' },
        { status: 500 }
      )
    }
  })
}

// Clear metrics (admin only)
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (request, user) => {
    try {
      const isAdmin = user?.role === 'admin' // Adjust based on your user model

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      performanceMonitor.clearMetrics()

      logger.info('Metrics cleared', {
        userId: user?.id
      })

      return NextResponse.json({
        success: true,
        message: 'Metrics cleared successfully'
      })

    } catch (error) {
      logger.error('Failed to clear metrics', error as Error)
      return NextResponse.json(
        { error: 'Failed to clear metrics' },
        { status: 500 }
      )
    }
  })
}