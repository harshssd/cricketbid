'use client'

import { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardStepProps {
  title?: string
  description?: string
  children: ReactNode
  errors?: Record<string, string[]>
  warnings?: string[]
  info?: string[]
  className?: string
}

export function WizardStep({
  title,
  description,
  children,
  errors = {},
  warnings = [],
  info = [],
  className
}: WizardStepProps) {
  const hasErrors = Object.keys(errors).length > 0
  const hasWarnings = warnings.length > 0
  const hasInfo = info.length > 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Alerts */}
      {hasErrors && (
        <div className="space-y-2">
          {Object.entries(errors).map(([field, fieldErrors]) =>
            fieldErrors.map((error, index) => (
              <Alert key={`${field}-${index}`} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{field}:</strong> {error}
                </AlertDescription>
              </Alert>
            ))
          )}
        </div>
      )}

      {hasWarnings && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={`warning-${index}`} className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {hasInfo && (
        <div className="space-y-2">
          {info.map((infoText, index) => (
            <Alert key={`info-${index}`} className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>{infoText}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Step Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

// Utility component for form sections within steps
interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  required?: boolean
  className?: string
}

export function FormSection({
  title,
  description,
  children,
  required = false,
  className
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h4>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// Utility component for displaying validation status
interface ValidationStatusProps {
  isValid: boolean
  message?: string
  showIcon?: boolean
}

export function ValidationStatus({
  isValid,
  message,
  showIcon = true
}: ValidationStatusProps) {
  if (!message) return null

  return (
    <div className={cn(
      "flex items-center space-x-2 text-sm",
      {
        "text-green-600 dark:text-green-400": isValid,
        "text-red-600 dark:text-red-400": !isValid
      }
    )}>
      {showIcon && (
        isValid ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )
      )}
      <span>{message}</span>
    </div>
  )
}