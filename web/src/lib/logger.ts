type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
  error?: Error
}

class Logger {
  private logLevel: LogLevel
  private isDevelopment: boolean

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context, userId, requestId, error } = entry

    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`

    if (userId) formatted += ` | userId: ${userId}`
    if (requestId) formatted += ` | requestId: ${requestId}`
    if (context) formatted += ` | context: ${JSON.stringify(context)}`
    if (error) {
      formatted += ` | error: ${error.message}`
      if (this.isDevelopment && error.stack) {
        formatted += `\n${error.stack}`
      }
    }

    return formatted
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    }

    const formattedMessage = this.formatMessage(entry)

    // Console output with appropriate method
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }

    // In production, you might want to send logs to external service
    if (!this.isDevelopment) {
      this.sendToExternalLogger(entry)
    }
  }

  private async sendToExternalLogger(entry: LogEntry) {
    // Example: Send to Sentry, DataDog, CloudWatch, etc.
    // Implementation depends on your logging service
    try {
      // Example for Sentry
      // if (entry.level === 'error' && entry.error) {
      //   Sentry.captureException(entry.error, {
      //     contexts: { custom: entry.context },
      //     user: { id: entry.userId }
      //   })
      // }
    } catch (logError) {
      console.error('Failed to send log to external service:', logError)
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
  }

  // Specialized methods for common use cases
  apiRequest(method: string, path: string, userId?: string, duration?: number) {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      userId,
      duration: duration ? `${duration}ms` : undefined
    })
  }

  apiError(method: string, path: string, error: Error, userId?: string) {
    this.error(`API ${method} ${path} failed`, error, {
      method,
      path,
      userId
    })
  }

  databaseQuery(query: string, duration?: number, error?: Error) {
    if (error) {
      this.error('Database query failed', error, { query, duration })
    } else {
      this.debug('Database query executed', { query, duration: duration ? `${duration}ms` : undefined })
    }
  }

  authEvent(event: string, userId?: string, success: boolean = true) {
    const level = success ? 'info' : 'warn'
    this.log(level, `Auth event: ${event}`, { userId, success })
  }

  businessLogic(action: string, context?: Record<string, any>) {
    this.info(`Business logic: ${action}`, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types for external use
export type { LogLevel, LogEntry }