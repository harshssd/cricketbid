import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from './logger'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean
  public code?: string

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

interface ErrorDetails {
  message: string
  statusCode: number
  code?: string
  details?: any
  stack?: string
}

export function handleError(error: unknown, context?: Record<string, any>): ErrorDetails {
  // Log the error
  logger.error('Unhandled error occurred', error instanceof Error ? error : new Error(String(error)), context)

  // Handle known error types
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      message: 'Validation error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const { code, message } = error

    switch (code) {
      case 'P2002':
        return {
          message: 'A record with this information already exists',
          statusCode: 409,
          code: 'DUPLICATE_ENTRY'
        }
      case 'P2025':
        return {
          message: 'Record not found',
          statusCode: 404,
          code: 'NOT_FOUND'
        }
      case 'P2003':
        return {
          message: 'Invalid reference to related record',
          statusCode: 400,
          code: 'FOREIGN_KEY_CONSTRAINT'
        }
      case 'P2034':
        return {
          message: 'Transaction failed due to conflict',
          statusCode: 409,
          code: 'TRANSACTION_CONFLICT'
        }
      default:
        return {
          message: 'Database operation failed',
          statusCode: 500,
          code: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? message : undefined
        }
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    }
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    return {
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }

  // Handle unknown errors
  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
    code: 'UNKNOWN_ERROR'
  }
}

export function createErrorResponse(error: unknown, context?: Record<string, any>): NextResponse {
  const errorDetails = handleError(error, context)

  return NextResponse.json({
    error: errorDetails.message,
    code: errorDetails.code,
    details: errorDetails.details,
    stack: errorDetails.stack,
    timestamp: new Date().toISOString()
  }, { status: errorDetails.statusCode })
}

// Global error boundary for API routes
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: Record<string, any>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error, { ...context, args })
    }
  }
}

// React error boundary helper
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// Client-side error reporting
export function reportClientError(error: Error, context?: Record<string, any>) {
  // In production, you might want to send this to an error tracking service
  console.error('Client error:', error, context)

  // Example: Send to error tracking service
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', 'exception', {
  //     description: error.message,
  //     fatal: false
  //   })
  // }
}