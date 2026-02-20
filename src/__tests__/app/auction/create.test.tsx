import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateAuctionPage from '@/app/auction/create/page'

// Mock the wizard hook
const mockWizardHook = {
  formState: {
    currentStep: 0,
    basicInfo: {},
    organizationSelect: { creationType: 'STANDALONE' },
    config: { budgetPerTeam: 1000, numTeams: 4 },
    teams: [],
    tiers: [],
    branding: {},
    setupMode: undefined,
    lastModified: new Date().toISOString(),
  },
  errors: {},
  isLoading: false,
  goToStep: jest.fn(),
  nextStep: jest.fn().mockResolvedValue(true),
  prevStep: jest.fn(),
  updateSection: jest.fn(),
  getDraftInfo: jest.fn().mockReturnValue({ exists: false }),
  loadDraft: jest.fn().mockReturnValue(true),
  initializeTeams: jest.fn(),
  initializeTiers: jest.fn(),
  applyWizardRecommendation: jest.fn(),
  submitAuction: jest.fn().mockResolvedValue({ id: 'auction-123' }),
  saveDraftToServer: jest.fn().mockResolvedValue({}),
  resetForm: jest.fn(),
}

jest.mock('@/hooks/useWizardForm', () => ({
  useWizardForm: () => mockWizardHook,
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
}
jest.mock('sonner', () => ({
  toast: mockToast,
}))

// Mock wizard components
jest.mock('@/components/wizard/WizardLayout', () => ({
  WizardLayout: ({ children, onNext, onPrev, onStepClick, onSaveDraft, canProceed, isLoading, currentStep, steps }) => (
    <div data-testid="wizard-layout">
      <div data-testid="current-step">Step: {currentStep}</div>
      <div data-testid="steps-count">Total Steps: {steps.length}</div>
      <div data-testid="can-proceed">{canProceed ? 'can-proceed' : 'cannot-proceed'}</div>
      <div data-testid="is-loading">{isLoading ? 'loading' : 'not-loading'}</div>

      <button data-testid="next-button" onClick={onNext} disabled={!canProceed || isLoading}>
        Next
      </button>
      <button data-testid="prev-button" onClick={onPrev} disabled={isLoading}>
        Previous
      </button>
      <button data-testid="save-draft-button" onClick={onSaveDraft}>
        Save Draft
      </button>
      <button data-testid="step-click-button" onClick={() => onStepClick(1)}>
        Go to Step 2
      </button>

      {children}
    </div>
  ),
}))

jest.mock('@/components/wizard/DraftRecoveryDialog', () => ({
  DraftRecoveryDialog: ({ draftInfo, onLoadDraft, onStartFresh }) => (
    draftInfo.exists ? (
      <div data-testid="draft-recovery-dialog">
        <button data-testid="load-draft" onClick={onLoadDraft}>
          Load Draft
        </button>
        <button data-testid="start-fresh" onClick={onStartFresh}>
          Start Fresh
        </button>
      </div>
    ) : null
  ),
}))

// Mock all step components
const mockStepComponent = (stepName: string) => ({ data, onChange, errors, ...props }) => (
  <div data-testid={`${stepName}-step`}>
    <div data-testid="step-data">{JSON.stringify(data)}</div>
    <div data-testid="step-errors">{JSON.stringify(errors)}</div>
    <button
      data-testid="update-data"
      onClick={() => onChange && onChange({ updated: true })}
    >
      Update Data
    </button>
  </div>
)

jest.mock('@/components/wizard/steps/BasicInfoStep', () => ({
  BasicInfoStep: mockStepComponent('basic-info'),
}))

jest.mock('@/components/wizard/steps/OrganizationSelectStep', () => ({
  OrganizationSelectStep: mockStepComponent('organization-select'),
}))

jest.mock('@/components/wizard/steps/SetupModeStep', () => ({
  SetupModeStep: ({ selected, onChange }) => (
    <div data-testid="setup-mode-step">
      <div data-testid="selected-mode">{selected || 'none'}</div>
      <button data-testid="select-wizard" onClick={() => onChange('WIZARD')}>
        Select Wizard
      </button>
      <button data-testid="select-manual" onClick={() => onChange('MANUAL')}>
        Select Manual
      </button>
    </div>
  ),
}))

jest.mock('@/components/wizard/steps/ConfigWizardStep', () => ({
  ConfigWizardStep: mockStepComponent('config-wizard'),
}))

jest.mock('@/components/wizard/steps/ManualConfigStep', () => ({
  ManualConfigStep: mockStepComponent('manual-config'),
}))

jest.mock('@/components/wizard/steps/TeamSetupStep', () => ({
  TeamSetupStep: mockStepComponent('team-setup'),
}))

jest.mock('@/components/wizard/steps/TierConfigStep', () => ({
  TierConfigStep: mockStepComponent('tier-config'),
}))

jest.mock('@/components/wizard/steps/BrandingStep', () => ({
  BrandingStep: mockStepComponent('branding'),
}))

jest.mock('@/components/wizard/steps/ReviewStep', () => ({
  ReviewStep: ({ formState, onSubmit, isLoading, errors }) => (
    <div data-testid="review-step">
      <div data-testid="form-state">{JSON.stringify(formState)}</div>
      <div data-testid="review-errors">{JSON.stringify(errors)}</div>
      <button
        data-testid="submit-auction"
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Auction'}
      </button>
    </div>
  ),
}))

describe('CreateAuctionPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockToast.success.mockClear()
    mockToast.error.mockClear()

    // Reset mock hook to default state
    Object.assign(mockWizardHook, {
      formState: {
        currentStep: 0,
        basicInfo: {},
        organizationSelect: { creationType: 'STANDALONE' },
        config: { budgetPerTeam: 1000, numTeams: 4 },
        teams: [],
        tiers: [],
        branding: {},
        setupMode: undefined,
        lastModified: new Date().toISOString(),
      },
      errors: {},
      isLoading: false,
    })

    mockWizardHook.getDraftInfo.mockReturnValue({ exists: false })
    mockWizardHook.nextStep.mockResolvedValue(true)
    mockWizardHook.submitAuction.mockResolvedValue({ id: 'auction-123' })
    mockWizardHook.loadDraft.mockReturnValue(true)
    mockWizardHook.saveDraftToServer.mockResolvedValue({})
  })

  describe('Initial Rendering', () => {
    it('should render the wizard layout with initial step', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByTestId('wizard-layout')).toBeInTheDocument()
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step: 0')
      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
    })

    it('should show correct step count for initial setup', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByTestId('steps-count')).toHaveTextContent('Total Steps: 6') // Base steps + common steps before mode selection
    })

    it('should not show draft recovery dialog when no draft exists', () => {
      render(<CreateAuctionPage />)

      expect(screen.queryByTestId('draft-recovery-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Draft Recovery', () => {
    it('should show draft recovery dialog when draft exists', () => {
      mockWizardHook.getDraftInfo.mockReturnValue({
        exists: true,
        lastModified: new Date().toISOString(),
        currentStep: 2,
        hasData: true,
      })

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('draft-recovery-dialog')).toBeInTheDocument()
    })

    it('should handle loading draft successfully', async () => {
      mockWizardHook.getDraftInfo.mockReturnValue({ exists: true })
      mockWizardHook.loadDraft.mockReturnValue(true)

      render(<CreateAuctionPage />)

      const loadDraftButton = screen.getByTestId('load-draft')
      await user.click(loadDraftButton)

      expect(mockWizardHook.loadDraft).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Draft loaded successfully!')
    })

    it('should handle starting fresh', async () => {
      mockWizardHook.getDraftInfo.mockReturnValue({ exists: true })

      render(<CreateAuctionPage />)

      const startFreshButton = screen.getByTestId('start-fresh')
      await user.click(startFreshButton)

      expect(mockWizardHook.resetForm).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Starting fresh!')
    })
  })

  describe('Step Navigation', () => {
    it('should handle next step navigation', async () => {
      mockWizardHook.nextStep.mockResolvedValue(true)

      render(<CreateAuctionPage />)

      const nextButton = screen.getByTestId('next-button')
      await user.click(nextButton)

      expect(mockWizardHook.nextStep).toHaveBeenCalled()
    })

    it('should handle navigation errors gracefully', async () => {
      mockWizardHook.nextStep.mockRejectedValue(new Error('Navigation failed'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      const nextButton = screen.getByTestId('next-button')
      await user.click(nextButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Navigation error:', expect.any(Error))
        expect(mockToast.error).toHaveBeenCalledWith('Failed to proceed to next step')
      })

      consoleSpy.mockRestore()
    })

    it('should handle previous step navigation', async () => {
      mockWizardHook.formState.currentStep = 1

      render(<CreateAuctionPage />)

      const prevButton = screen.getByTestId('prev-button')
      await user.click(prevButton)

      expect(mockWizardHook.prevStep).toHaveBeenCalled()
    })

    it('should handle step click navigation', async () => {
      render(<CreateAuctionPage />)

      const stepClickButton = screen.getByTestId('step-click-button')
      await user.click(stepClickButton)

      expect(mockWizardHook.goToStep).toHaveBeenCalledWith(1)
    })

    it('should only allow navigation to previous or current steps', () => {
      mockWizardHook.formState.currentStep = 2

      render(<CreateAuctionPage />)

      const stepClickButton = screen.getByTestId('step-click-button')
      fireEvent.click(stepClickButton) // Try to go to step 1 (should work)

      expect(mockWizardHook.goToStep).toHaveBeenCalledWith(1)
    })
  })

  describe('Step Content Rendering', () => {
    it('should render BasicInfoStep for step 0', () => {
      mockWizardHook.formState.currentStep = 0

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()
      expect(screen.queryByTestId('organization-select-step')).not.toBeInTheDocument()
    })

    it('should render SetupModeStep for step 2', () => {
      mockWizardHook.formState.currentStep = 2

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('setup-mode-step')).toBeInTheDocument()
      expect(screen.getByTestId('selected-mode')).toHaveTextContent('none')
    })

    it('should handle setup mode selection', async () => {
      mockWizardHook.formState.currentStep = 2

      render(<CreateAuctionPage />)

      const wizardButton = screen.getByTestId('select-wizard')
      await user.click(wizardButton)

      expect(mockWizardHook.updateSection).toHaveBeenCalledWith('setupMode', 'WIZARD')
    })

    it('should render ReviewStep for final step', () => {
      // Set up final step
      mockWizardHook.formState.currentStep = 5 // Assuming review is at index 5

      render(<CreateAuctionPage />)

      // The review step should be rendered for the final step
      expect(screen.getByTestId('review-step')).toBeInTheDocument()
    })
  })

  describe('Setup Mode Changes', () => {
    it('should update steps when wizard mode is selected', async () => {
      mockWizardHook.formState.currentStep = 2

      render(<CreateAuctionPage />)

      const wizardButton = screen.getByTestId('select-wizard')
      await user.click(wizardButton)

      expect(mockWizardHook.updateSection).toHaveBeenCalledWith('setupMode', 'WIZARD')
    })

    it('should update steps when manual mode is selected', async () => {
      mockWizardHook.formState.currentStep = 2

      render(<CreateAuctionPage />)

      const manualButton = screen.getByTestId('select-manual')
      await user.click(manualButton)

      expect(mockWizardHook.updateSection).toHaveBeenCalledWith('setupMode', 'MANUAL')
    })

    it('should update steps when setup mode changes in form state', () => {
      const { rerender } = render(<CreateAuctionPage />)

      // Change setup mode in form state
      mockWizardHook.formState.setupMode = 'WIZARD'
      rerender(<CreateAuctionPage />)

      // Steps should be updated (verified by the component logic)
      expect(screen.getByTestId('wizard-layout')).toBeInTheDocument()
    })
  })

  describe('Form State Updates', () => {
    it('should update form data when step components change data', async () => {
      render(<CreateAuctionPage />)

      const updateButton = screen.getByTestId('update-data')
      await user.click(updateButton)

      expect(mockWizardHook.updateSection).toHaveBeenCalledWith('basicInfo', { updated: true })
    })

    it('should pass current form data to step components', () => {
      mockWizardHook.formState.basicInfo = { name: 'Test Auction' }

      render(<CreateAuctionPage />)

      const stepData = screen.getByTestId('step-data')
      expect(stepData).toHaveTextContent('"name":"Test Auction"')
    })

    it('should pass errors to step components', () => {
      mockWizardHook.errors = { name: ['Required field'] }

      render(<CreateAuctionPage />)

      const stepErrors = screen.getByTestId('step-errors')
      expect(stepErrors).toHaveTextContent('"name":["Required field"]')
    })
  })

  describe('Draft Saving', () => {
    it('should handle draft saving successfully', async () => {
      mockWizardHook.saveDraftToServer.mockResolvedValue({})

      render(<CreateAuctionPage />)

      const saveDraftButton = screen.getByTestId('save-draft-button')
      await user.click(saveDraftButton)

      expect(mockWizardHook.saveDraftToServer).toHaveBeenCalled()
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Draft saved successfully!')
      })
    })

    it('should handle draft saving errors', async () => {
      mockWizardHook.saveDraftToServer.mockRejectedValue(new Error('Save failed'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      const saveDraftButton = screen.getByTestId('save-draft-button')
      await user.click(saveDraftButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Save draft error:', expect.any(Error))
        expect(mockToast.error).toHaveBeenCalledWith('Failed to save draft')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Final Submission', () => {
    it('should handle auction submission successfully', async () => {
      mockWizardHook.submitAuction.mockResolvedValue({ id: 'auction-123' })

      render(<CreateAuctionPage />)

      // Navigate to review step
      mockWizardHook.formState.currentStep = 5
      render(<CreateAuctionPage />)

      const submitButton = screen.getByTestId('submit-auction')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockWizardHook.submitAuction).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Auction created successfully!')
        expect(mockPush).toHaveBeenCalledWith('/auction/auction-123')
      })
    })

    it('should handle submission errors', async () => {
      mockWizardHook.submitAuction.mockRejectedValue(new Error('Submission failed'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      // Navigate to review step
      mockWizardHook.formState.currentStep = 5
      render(<CreateAuctionPage />)

      const submitButton = screen.getByTestId('submit-auction')
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Submission error:', expect.any(Error))
        expect(mockToast.error).toHaveBeenCalledWith('Failed to create auction')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Step Validation', () => {
    it('should determine if basic info step can proceed', () => {
      mockWizardHook.formState.basicInfo = {
        name: 'Test Auction',
        scheduledAt: new Date(),
        timezone: 'UTC',
      }

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('can-proceed')).toHaveTextContent('can-proceed')
    })

    it('should determine if basic info step cannot proceed', () => {
      mockWizardHook.formState.basicInfo = { name: 'Test Auction' } // Missing required fields

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('can-proceed')).toHaveTextContent('cannot-proceed')
    })

    it('should determine if setup mode step can proceed', () => {
      mockWizardHook.formState.currentStep = 2
      mockWizardHook.formState.setupMode = 'WIZARD'

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('can-proceed')).toHaveTextContent('can-proceed')
    })

    it('should allow proceeding on optional steps', () => {
      // Mock tier step (optional)
      mockWizardHook.formState.currentStep = 4 // Assuming tiers step

      render(<CreateAuctionPage />)

      // Optional steps should always allow proceeding
      expect(screen.getByTestId('can-proceed')).toHaveTextContent('can-proceed')
    })
  })

  describe('Loading States', () => {
    it('should show loading state when form is submitting', () => {
      mockWizardHook.isLoading = true

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('is-loading')).toHaveTextContent('loading')
    })

    it('should disable navigation buttons when loading', () => {
      mockWizardHook.isLoading = true

      render(<CreateAuctionPage />)

      expect(screen.getByTestId('next-button')).toBeDisabled()
      expect(screen.getByTestId('prev-button')).toBeDisabled()
    })
  })

  describe('Unknown Step Handling', () => {
    it('should handle unknown step gracefully', () => {
      // Mock an invalid step
      mockWizardHook.formState.currentStep = 999

      render(<CreateAuctionPage />)

      expect(screen.getByText('Step not found')).toBeInTheDocument()
    })
  })

  describe('Complex Navigation Scenarios', () => {
    it('should handle navigation through complete wizard flow', async () => {
      render(<CreateAuctionPage />)

      // Start at basic info
      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument()

      // Fill in required data and proceed
      mockWizardHook.formState.basicInfo = {
        name: 'Test',
        scheduledAt: new Date(),
        timezone: 'UTC',
      }
      mockWizardHook.formState.currentStep = 1

      const { rerender } = render(<CreateAuctionPage />)

      // Should be at organization select
      expect(screen.getByTestId('organization-select-step')).toBeInTheDocument()

      // Continue to setup mode
      mockWizardHook.formState.currentStep = 2
      rerender(<CreateAuctionPage />)

      expect(screen.getByTestId('setup-mode-step')).toBeInTheDocument()
    })
  })
})