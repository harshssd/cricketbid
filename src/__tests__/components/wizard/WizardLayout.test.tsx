import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardLayout } from '@/components/wizard/WizardLayout'

// Mock AutoSaveIndicator since it's a dependency
jest.mock('@/components/wizard/AutoSaveIndicator', () => ({
  AutoSaveIndicator: ({ lastSaved }: { lastSaved?: string }) => (
    <div data-testid="auto-save-indicator">
      {lastSaved ? `Last saved: ${lastSaved}` : 'Not saved'}
    </div>
  ),
}))

describe('WizardLayout Component', () => {
  const mockSteps = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      subtitle: 'Enter auction details',
      isCompleted: false,
      isActive: true,
      isDisabled: false,
      isRequired: true,
    },
    {
      id: 'configuration',
      title: 'Configuration',
      subtitle: 'Set up auction rules',
      isCompleted: false,
      isActive: false,
      isDisabled: false,
      isRequired: true,
    },
    {
      id: 'teams',
      title: 'Teams',
      subtitle: 'Configure teams',
      isCompleted: false,
      isActive: false,
      isDisabled: true,
      isRequired: false,
    },
    {
      id: 'review',
      title: 'Review',
      subtitle: 'Final review',
      isCompleted: false,
      isActive: false,
      isDisabled: false,
      isRequired: true,
    },
  ]

  const defaultProps = {
    currentStep: 0,
    steps: mockSteps,
    children: <div data-testid="step-content">Step Content</div>,
  }

  describe('Basic Rendering', () => {
    it('should render the wizard layout with basic elements', () => {
      render(<WizardLayout {...defaultProps} />)

      expect(screen.getByText('Create Auction')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
      expect(screen.getByText('Setup Progress')).toBeInTheDocument()
      expect(screen.getByTestId('step-content')).toBeInTheDocument()
    })

    it('should display current step title and subtitle', () => {
      render(<WizardLayout {...defaultProps} />)

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Enter auction details')).toBeInTheDocument()
    })

    it('should render all steps in sidebar', () => {
      render(<WizardLayout {...defaultProps} />)

      mockSteps.forEach(step => {
        expect(screen.getByText(step.title)).toBeInTheDocument()
      })
    })

    it('should handle missing subtitle gracefully', () => {
      const stepsWithoutSubtitle = [
        {
          ...mockSteps[0],
          subtitle: undefined,
        },
        ...mockSteps.slice(1),
      ]

      render(<WizardLayout {...defaultProps} steps={stepsWithoutSubtitle} />)

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.queryByText('Enter auction details')).not.toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should display correct progress for first step', () => {
      render(<WizardLayout {...defaultProps} currentStep={0} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '25') // 1/4 * 100 = 25
    })

    it('should display correct progress for middle step', () => {
      render(<WizardLayout {...defaultProps} currentStep={1} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50') // 2/4 * 100 = 50
    })

    it('should display correct progress for last step', () => {
      render(<WizardLayout {...defaultProps} currentStep={3} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100') // 4/4 * 100 = 100
    })
  })

  describe('Step Navigation', () => {
    const onStepClick = jest.fn()

    beforeEach(() => {
      onStepClick.mockClear()
    })

    it('should call onStepClick when step is clicked', () => {
      render(<WizardLayout {...defaultProps} onStepClick={onStepClick} />)

      const configurationStep = screen.getByText('Configuration')
      fireEvent.click(configurationStep)

      expect(onStepClick).toHaveBeenCalledWith(1)
    })

    it('should not call onStepClick for disabled steps', () => {
      render(<WizardLayout {...defaultProps} onStepClick={onStepClick} />)

      const disabledStep = screen.getByText('Teams')
      fireEvent.click(disabledStep)

      expect(onStepClick).not.toHaveBeenCalled()
    })

    it('should not call onStepClick when loading', () => {
      render(<WizardLayout {...defaultProps} onStepClick={onStepClick} isLoading={true} />)

      const step = screen.getByText('Configuration')
      fireEvent.click(step)

      expect(onStepClick).not.toHaveBeenCalled()
    })

    it('should apply correct styling for active step', () => {
      render(<WizardLayout {...defaultProps} />)

      const activeStepButton = screen.getByText('Basic Information').closest('button')
      expect(activeStepButton).toHaveClass('bg-blue-50')
    })

    it('should apply correct styling for disabled step', () => {
      render(<WizardLayout {...defaultProps} />)

      const disabledStepButton = screen.getByText('Teams').closest('button')
      expect(disabledStepButton).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('Step Indicators', () => {
    it('should show step numbers for incomplete steps', () => {
      render(<WizardLayout {...defaultProps} />)

      // Check step numbers (1, 2, 3, 4)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should show checkmark for completed steps', () => {
      const stepsWithCompleted = mockSteps.map((step, index) => ({
        ...step,
        isCompleted: index === 0,
        isActive: index === 1,
      }))

      render(<WizardLayout {...defaultProps} steps={stepsWithCompleted} currentStep={1} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })
  })

  describe('Navigation Buttons', () => {
    const onNext = jest.fn()
    const onPrev = jest.fn()

    beforeEach(() => {
      onNext.mockClear()
      onPrev.mockClear()
    })

    it('should not show Previous button on first step', () => {
      render(<WizardLayout {...defaultProps} currentStep={0} onPrev={onPrev} />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    })

    it('should show Previous button on non-first steps', () => {
      render(<WizardLayout {...defaultProps} currentStep={1} onPrev={onPrev} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
    })

    it('should call onPrev when Previous button is clicked', () => {
      render(<WizardLayout {...defaultProps} currentStep={1} onPrev={onPrev} />)

      fireEvent.click(screen.getByText('Previous'))
      expect(onPrev).toHaveBeenCalled()
    })

    it('should show Continue button on non-final steps', () => {
      render(<WizardLayout {...defaultProps} currentStep={0} onNext={onNext} />)

      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('should show Create Auction button on final step', () => {
      render(<WizardLayout {...defaultProps} currentStep={3} onNext={onNext} />)

      expect(screen.getByText('Create Auction')).toBeInTheDocument()
      expect(screen.queryByText('Continue')).not.toBeInTheDocument()
    })

    it('should call onNext when Continue button is clicked', () => {
      render(<WizardLayout {...defaultProps} currentStep={0} onNext={onNext} />)

      fireEvent.click(screen.getByText('Continue'))
      expect(onNext).toHaveBeenCalled()
    })

    it('should disable navigation buttons when loading', () => {
      render(<WizardLayout {...defaultProps} currentStep={1} onNext={onNext} onPrev={onPrev} isLoading={true} />)

      expect(screen.getByText('Previous')).toBeDisabled()
      expect(screen.getByText('Continue')).toBeDisabled()
    })

    it('should disable Continue button when canProceed is false', () => {
      render(<WizardLayout {...defaultProps} onNext={onNext} canProceed={false} />)

      expect(screen.getByText('Continue')).toBeDisabled()
    })
  })

  describe('Optional Steps', () => {
    it('should show Skip button for optional steps', () => {
      const stepsWithOptional = mockSteps.map((step, index) => ({
        ...step,
        isRequired: index !== 0, // Make first step optional
        isActive: index === 0,
      }))

      render(<WizardLayout {...defaultProps} steps={stepsWithOptional} currentStep={0} onNext={() => {}} />)

      expect(screen.getByText('Skip This Step')).toBeInTheDocument()
    })

    it('should not show Skip button for required steps', () => {
      render(<WizardLayout {...defaultProps} onNext={() => {}} />)

      expect(screen.queryByText('Skip This Step')).not.toBeInTheDocument()
    })

    it('should not show Skip button on final step', () => {
      const stepsWithOptional = mockSteps.map((step, index) => ({
        ...step,
        isRequired: false,
        isActive: index === 3,
      }))

      render(<WizardLayout {...defaultProps} steps={stepsWithOptional} currentStep={3} onNext={() => {}} />)

      expect(screen.queryByText('Skip This Step')).not.toBeInTheDocument()
    })
  })

  describe('Save Draft Functionality', () => {
    const onSaveDraft = jest.fn()

    beforeEach(() => {
      onSaveDraft.mockClear()
    })

    it('should show Save Draft button in header by default', () => {
      render(<WizardLayout {...defaultProps} onSaveDraft={onSaveDraft} />)

      const saveDraftButtons = screen.getAllByText('Save Draft')
      expect(saveDraftButtons.length).toBeGreaterThan(0)
    })

    it('should hide Save Draft button when showSaveDraft is false', () => {
      render(<WizardLayout {...defaultProps} onSaveDraft={onSaveDraft} showSaveDraft={false} />)

      expect(screen.queryByText('Save Draft')).not.toBeInTheDocument()
    })

    it('should call onSaveDraft when Save Draft button is clicked', () => {
      render(<WizardLayout {...defaultProps} onSaveDraft={onSaveDraft} />)

      fireEvent.click(screen.getAllByText('Save Draft')[0])
      expect(onSaveDraft).toHaveBeenCalled()
    })

    it('should disable Save Draft button when loading', () => {
      render(<WizardLayout {...defaultProps} onSaveDraft={onSaveDraft} isLoading={true} />)

      const saveDraftButton = screen.getAllByText('Save Draft')[0]
      expect(saveDraftButton).toBeDisabled()
    })
  })

  describe('Auto-save Indicator', () => {
    it('should show auto-save indicator with last modified time', () => {
      const lastModified = new Date().toISOString()
      render(<WizardLayout {...defaultProps} lastModified={lastModified} />)

      expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument()
      expect(screen.getByText(`Last saved: ${lastModified}`)).toBeInTheDocument()
    })

    it('should show not saved when no lastModified', () => {
      render(<WizardLayout {...defaultProps} />)

      expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument()
      expect(screen.getByText('Not saved')).toBeInTheDocument()
    })
  })

  describe('Responsive and Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<WizardLayout {...defaultProps} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<WizardLayout {...defaultProps} className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty steps array gracefully', () => {
      render(<WizardLayout {...defaultProps} steps={[]} />)

      expect(screen.getByText('Step 1 of 0')).toBeInTheDocument()
    })

    it('should handle currentStep out of bounds', () => {
      render(<WizardLayout {...defaultProps} currentStep={10} />)

      // Should not crash
      expect(screen.getByTestId('step-content')).toBeInTheDocument()
    })

    it('should handle missing callback functions gracefully', () => {
      render(<WizardLayout {...defaultProps} />)

      // Should not crash when buttons are clicked without handlers
      const continueButton = screen.getByText('Continue')
      expect(() => fireEvent.click(continueButton)).not.toThrow()
    })
  })

  describe('Complex Navigation Scenarios', () => {
    it('should handle step completion state changes', () => {
      const { rerender } = render(<WizardLayout {...defaultProps} currentStep={0} />)

      // Initially no checkmarks
      expect(screen.queryByText('✓')).not.toBeInTheDocument()

      // Complete first step
      const completedSteps = mockSteps.map((step, index) => ({
        ...step,
        isCompleted: index === 0,
        isActive: index === 1,
      }))

      rerender(<WizardLayout {...defaultProps} steps={completedSteps} currentStep={1} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('should update step indicators correctly when step changes', () => {
      const { rerender } = render(<WizardLayout {...defaultProps} currentStep={0} />)

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()

      rerender(<WizardLayout {...defaultProps} currentStep={2} />)

      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    })
  })
})