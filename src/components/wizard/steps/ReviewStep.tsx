'use client'

import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WizardFormStateData } from '@/lib/validations/auction'
import { Sparkles } from 'lucide-react'

interface ReviewStepProps {
  formState: WizardFormStateData
  onSubmit: () => void
  isLoading: boolean
  errors?: Record<string, string[]>
}

export function ReviewStep({ formState, onSubmit, isLoading, errors = {} }: ReviewStepProps) {
  return (
    <WizardStep
      title="Review & Create"
      description="Review your auction configuration and create"
      errors={errors}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-4">Review Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              This step will show a complete summary of your auction configuration.
            </p>

            <Button
              onClick={onSubmit}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Create Auction</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}