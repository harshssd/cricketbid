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
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-muted-foreground">
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
            <Alert key={`warning-${index}`} className="border-warning/30 bg-warning/10 text-warning-foreground">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {hasInfo && (
        <div className="space-y-2">
          {info.map((infoText, index) => (
            <Alert key={`info-${index}`} className="border-info/30 bg-info/10 text-info-foreground">
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
        <h4 className="text-base font-medium text-foreground flex items-center">
          {title}
          {required && <span className="text-destructive ml-1">*</span>}
        </h4>
        {description && (
          <p className="text-sm text-muted-foreground">
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
        "text-success": isValid,
        "text-destructive": !isValid
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