'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react'
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
    <div className={cn("min-h-screen bg-gradient-to-br from-background to-muted", className)}>
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  Create Auction
                </h1>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-sm text-muted-foreground">
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
                        "hover:bg-muted",
                        {
                          "bg-info/10 border-l-4 border-primary": step.isActive,
                          "opacity-50 cursor-not-allowed": step.isDisabled,
                          "hover:bg-accent": !step.isActive && !step.isDisabled
                        }
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors",
                          {
                            "bg-success border-success text-white": step.isCompleted,
                            "bg-primary border-primary text-primary-foreground": step.isActive,
                            "border-border text-muted-foreground": !step.isActive && !step.isCompleted,
                          }
                        )}>
                          {step.isCompleted ? '✓' : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            {
                              "text-info-foreground": step.isActive,
                              "text-success-foreground": step.isCompleted && !step.isActive,
                              "text-foreground": !step.isActive && !step.isCompleted,
                            }
                          )}>
                            {step.title}
                          </p>
                          {step.subtitle && (
                            <p className="text-xs text-muted-foreground mt-1">
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {currentStepData?.title}
                  </h2>
                  {currentStepData?.subtitle && (
                    <p className="text-muted-foreground">
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
                    {lastModified && (
                      <span className="text-xs text-muted-foreground">Last saved: {new Date(lastModified).toLocaleTimeString()}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Show skip button for optional steps */}
                    {currentStep < steps.length - 1 && currentStepData?.isRequired === false && (
                      <Button
                        variant="ghost"
                        onClick={onNext}
                        disabled={isLoading}
                        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
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
                        className="flex items-center space-x-2 bg-success hover:bg-success/90"
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