import { logger } from './logger'

interface PerformanceMetrics {
  responseTime: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage?: NodeJS.CpuUsage
  timestamp: string
  endpoint?: string
  userId?: string
  statusCode?: number
}

interface ErrorMetrics {
  message: string
  stack?: string
  endpoint?: string
  userId?: string
  statusCode: number
  timestamp: string
}

class PerformanceMonitor {
  private startTimes = new Map<string, number>()
  private cpuUsageStart = new Map<string, NodeJS.CpuUsage>()
  private metrics: PerformanceMetrics[] = []
  private errors: ErrorMetrics[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics in memory

  startTimer(key: string): void {
    this.startTimes.set(key, Date.now())
    this.cpuUsageStart.set(key, process.cpuUsage())
  }

  endTimer(key: string, context?: {
    endpoint?: string
    userId?: string
    statusCode?: number
  }): number {
    const startTime = this.startTimes.get(key)
    const cpuStart = this.cpuUsageStart.get(key)

    if (!startTime) {
      logger.warn('Timer not found for key', { key })
      return 0
    }

    const responseTime = Date.now() - startTime
    const memoryUsage = process.memoryUsage()

    let cpuUsage: NodeJS.CpuUsage | undefined
    if (cpuStart) {
      cpuUsage = process.cpuUsage(cpuStart)
    }

    const metric: PerformanceMetrics = {
      responseTime,
      memoryUsage,
      cpuUsage,
      timestamp: new Date().toISOString(),
      ...context
    }

    // Add to metrics array
    this.metrics.push(metric)

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        responseTime: `${responseTime}ms`,
        endpoint: context?.endpoint,
        userId: context?.userId
      })
    }

    // Clean up
    this.startTimes.delete(key)
    this.cpuUsageStart.delete(key)

    return responseTime
  }

  recordError(error: Error, context?: {
    endpoint?: string
    userId?: string
    statusCode?: number
  }): void {
    const errorMetric: ErrorMetrics = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      statusCode: context?.statusCode || 500,
      timestamp: new Date().toISOString(),
      ...context
    }

    this.errors.push(errorMetric)

    // Keep only last N errors
    if (this.errors.length > this.maxMetrics) {
      this.errors.shift()
    }

    // Log error
    logger.error('Error recorded by monitor', error, context)
  }

  getMetrics(): {
    recent: PerformanceMetrics[]
    summary: {
      averageResponseTime: number
      slowestRequest: number
      fastestRequest: number
      totalRequests: number
      errorRate: number
      memoryUsage: {
        current: number
        peak: number
        average: number
      }
    }
  } {
    if (this.metrics.length === 0) {
      return {
        recent: [],
        summary: {
          averageResponseTime: 0,
          slowestRequest: 0,
          fastestRequest: 0,
          totalRequests: 0,
          errorRate: 0,
          memoryUsage: {
            current: 0,
            peak: 0,
            average: 0
          }
        }
      }
    }

    const responseTimes = this.metrics.map(m => m.responseTime)
    const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed)

    return {
      recent: this.metrics.slice(-10), // Last 10 requests
      summary: {
        averageResponseTime: Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        ),
        slowestRequest: Math.max(...responseTimes),
        fastestRequest: Math.min(...responseTimes),
        totalRequests: this.metrics.length,
        errorRate: this.errors.length / this.metrics.length * 100,
        memoryUsage: {
          current: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          peak: Math.round(Math.max(...memoryUsages) / 1024 / 1024),
          average: Math.round(
            memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length / 1024 / 1024
          )
        }
      }
    }
  }

  getErrors(): ErrorMetrics[] {
    return this.errors.slice(-20) // Last 20 errors
  }

  clearMetrics(): void {
    this.metrics = []
    this.errors = []
    this.startTimes.clear()
    this.cpuUsageStart.clear()
    logger.info('Performance metrics cleared')
  }

  // Middleware factory for API routes
  middleware() {
    return async (
      req: any,
      res: any,
      next: () => Promise<void>
    ) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Start monitoring
      this.startTimer(requestId)

      try {
        await next()

        // End monitoring on success
        this.endTimer(requestId, {
          endpoint: req.url,
          userId: req.headers['x-user-id'],
          statusCode: res.statusCode
        })
      } catch (error) {
        // Record error and end monitoring
        this.recordError(error as Error, {
          endpoint: req.url,
          userId: req.headers['x-user-id'],
          statusCode: res.statusCode || 500
        })

        this.endTimer(requestId, {
          endpoint: req.url,
          userId: req.headers['x-user-id'],
          statusCode: res.statusCode || 500
        })

        throw error
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function for measuring function execution time
export function measurePerformance<T>(
  fn: () => Promise<T>,
  label: string,
  context?: { endpoint?: string; userId?: string }
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const key = `${label}_${Date.now()}`

    try {
      performanceMonitor.startTimer(key)
      const result = await fn()
      performanceMonitor.endTimer(key, context)
      resolve(result)
    } catch (error) {
      performanceMonitor.recordError(error as Error, context)
      performanceMonitor.endTimer(key, context)
      reject(error)
    }
  })
}

// Export types
export type { PerformanceMetrics, ErrorMetrics }