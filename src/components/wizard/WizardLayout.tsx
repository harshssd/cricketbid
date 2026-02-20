'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react'
import { AutoSaveIndicator } from '@/components/wizard/AutoSaveIndicator'
import { cn } from '@/lib/utils'

interface WizardStep {
  id: string
  title: string
  subtitle?: string
  isCompleted?: boolean
  isActive?: boolean
  isDisabled?: boolean
  isRequired?: boolean
}

interface WizardLayoutProps {
  children: ReactNode
  currentStep: number
  steps: WizardStep[]
  onNext?: () => void
  onPrev?: () => void
  onStepClick?: (stepIndex: number) => void
  onSaveDraft?: () => void
  canProceed?: boolean
  isLoading?: boolean
  showSaveDraft?: boolean
  lastModified?: string
  className?: string
}

export function WizardLayout({
  children,
  currentStep,
  steps,
  onNext,
  onPrev,
  onStepClick,
  onSaveDraft,
  canProceed = true,
  isLoading = false,
  showSaveDraft = true,
  lastModified,
  className
}: WizardLayoutProps) {
  const progress = ((currentStep + 1) / steps.length) * 100
  const currentStepData = steps[currentStep]

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800", className)}>
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create Auction
                </h1>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>

            {showSaveDraft && (
              <Button
                variant="outline"
                onClick={onSaveDraft}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Setup Progress</h3>
                <nav className="space-y-1">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => onStepClick?.(index)}
                      disabled={step.isDisabled || isLoading}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-200 group",
                        "hover:bg-gray-50 dark:hover:bg-slate-800",
                        {
                          "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500": step.isActive,
                          "opacity-50 cursor-not-allowed": step.isDisabled,
                          "hover:bg-gray-100 dark:hover:bg-slate-700": !step.isActive && !step.isDisabled
                        }
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors",
                          {
                            "bg-green-500 border-green-500 text-white": step.isCompleted,
                            "bg-blue-500 border-blue-500 text-white": step.isActive,
                            "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400": !step.isActive && !step.isCompleted,
                          }
                        )}>
                          {step.isCompleted ? '✓' : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            {
                              "text-blue-700 dark:text-blue-300": step.isActive,
                              "text-green-700 dark:text-green-300": step.isCompleted && !step.isActive,
                              "text-gray-700 dark:text-gray-300": !step.isActive && !step.isCompleted,
                            }
                          )}>
                            {step.title}
                          </p>
                          {step.subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {step.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                {/* Step Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {currentStepData?.title}
                  </h2>
                  {currentStepData?.subtitle && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentStepData.subtitle}
                    </p>
                  )}
                </div>

                {/* Step Content */}
                <div className="mb-8">
                  {children}
                </div>

                {/* Navigation Footer */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="flex items-center space-x-4">
                    {currentStep > 0 && (
                      <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isLoading}
                        className="flex items-center space-x-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </Button>
                    )}
                    <AutoSaveIndicator lastSaved={lastModified} />
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Show skip button for optional steps */}
                    {currentStep < steps.length - 1 && currentStepData?.isRequired === false && (
                      <Button
                        variant="ghost"
                        onClick={onNext}
                        disabled={isLoading}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                      >
                        <span>Skip This Step</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Save draft button for non-final steps */}
                    {showSaveDraft && currentStep < steps.length - 1 && onSaveDraft && (
                      <Button
                        variant="outline"
                        onClick={onSaveDraft}
                        disabled={isLoading}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Draft</span>
                      </Button>
                    )}

                    {currentStep < steps.length - 1 ? (
                      <Button
                        onClick={onNext}
                        disabled={!canProceed || isLoading}
                        className="flex items-center space-x-2"
                      >
                        <span>Continue</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={onNext}
                        disabled={!canProceed || isLoading}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Create Auction</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}