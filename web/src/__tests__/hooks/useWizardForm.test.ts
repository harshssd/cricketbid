import { renderHook, act } from '@testing-library/react'
import { useWizardForm } from '@/hooks/useWizardForm'
import { validateStep } from '@/lib/validations/auction'
import { TierConfig } from '@/lib/types'

// Mock the validation function
jest.mock('@/lib/validations/auction', () => ({
  validateStep: jest.fn(),
  wizardFormStateSchema: {
    parse: jest.fn(),
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockValidateStep = validateStep as jest.MockedFunction<typeof validateStep>

describe('useWizardForm Hook', () => {
  beforeEach(() => {
    mockValidateStep.mockClear()
    mockPush.mockClear()

    // Set up successful validation by default
    mockValidateStep.mockReturnValue({
      isValid: true,
      errors: {},
      data: {},
    })
  })

  describe('Initial State', () => {
    it('should initialize with default form state', () => {
      const { result } = renderHook(() => useWizardForm())

      expect(result.current.formState.currentStep).toBe(0)
      expect(result.current.formState.basicInfo).toEqual({})
      expect(result.current.formState.config.budgetPerTeam).toBe(1000)
      expect(result.current.formState.config.currencyName).toBe('Coins')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.errors).toEqual({})
    })
  })

  describe('Form State Updates', () => {
    it('should update form state', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateFormState({
          currentStep: 1,
          basicInfo: { name: 'Updated Auction' },
        })
      })

      expect(result.current.formState.currentStep).toBe(1)
      expect(result.current.formState.basicInfo.name).toBe('Updated Auction')
    })

    it('should update specific sections', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateSection('basicInfo', { name: 'Section Update' })
      })

      expect(result.current.formState.basicInfo.name).toBe('Section Update')

      act(() => {
        result.current.updateSection('config', { budgetPerTeam: 2000 })
      })

      expect(result.current.formState.config.budgetPerTeam).toBe(2000)
      expect(result.current.formState.config.currencyName).toBe('Coins') // Existing values preserved
    })
  })

  describe('Navigation', () => {
    it('should navigate to specific step', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.goToStep(3)
      })

      expect(result.current.formState.currentStep).toBe(3)
      expect(result.current.errors).toEqual({})
    })

    it('should navigate to next step with validation', () => {
      const { result } = renderHook(() => useWizardForm())

      const stepData = { name: 'Valid Data' }
      const mockSchema = {}

      act(() => {
        const success = result.current.nextStep(stepData, mockSchema)
        expect(success).toBe(true)
      })

      expect(mockValidateStep).toHaveBeenCalledWith(stepData, mockSchema)
      expect(result.current.formState.currentStep).toBe(1)
      expect(result.current.errors).toEqual({})
    })

    it('should not proceed if validation fails', () => {
      const { result } = renderHook(() => useWizardForm())

      mockValidateStep.mockReturnValue({
        isValid: false,
        errors: { name: ['Name is required'] },
      })

      const stepData = { name: '' }
      const mockSchema = {}

      act(() => {
        const success = result.current.nextStep(stepData, mockSchema)
        expect(success).toBe(false)
      })

      expect(result.current.formState.currentStep).toBe(0) // Should not advance
      expect(result.current.errors).toEqual({ name: ['Name is required'] })
    })

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useWizardForm())

      // First go to step 2
      act(() => {
        result.current.goToStep(2)
      })

      expect(result.current.formState.currentStep).toBe(2)

      // Then go back
      act(() => {
        result.current.prevStep()
      })

      expect(result.current.formState.currentStep).toBe(1)
      expect(result.current.errors).toEqual({})
    })

    it('should not go below step 0', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.formState.currentStep).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useWizardForm())

      // Modify state first
      act(() => {
        result.current.updateFormState({ currentStep: 5 })
      })

      act(() => {
        result.current.resetForm()
      })

      expect(result.current.formState.currentStep).toBe(0)
      expect(result.current.errors).toEqual({})
    })
  })

  describe('Team and Tier Initialization', () => {
    it('should initialize teams with default names', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.initializeTeams(4)
      })

      expect(result.current.formState.teams).toHaveLength(4)
      expect(result.current.formState.teams?.[0].name).toBe('Team 1')
      expect(result.current.formState.teams?.[1].name).toBe('Team 2')
    })

    it('should initialize tiers with defaults', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.initializeTiers()
      })

      expect(result.current.formState.tiers).toBeDefined()
    })

    it('should initialize tiers with custom configuration', () => {
      const { result } = renderHook(() => useWizardForm())

      const customTiers: TierConfig[] = [
        {
          name: 'Custom Tier',
          basePrice: 123,
          color: '#FF0000',
          minPerTeam: 1,
          maxPerTeam: 2,
        },
      ]

      act(() => {
        result.current.initializeTiers(customTiers)
      })

      expect(result.current.formState.tiers).toHaveLength(1)
      expect(result.current.formState.tiers?.[0].name).toBe('Custom Tier')
      expect(result.current.formState.tiers?.[0].basePrice).toBe(123)
    })
  })

  describe('Preset Application', () => {
    it('should apply configuration preset', () => {
      const { result } = renderHook(() => useWizardForm())

      const preset = {
        budgetPerTeam: 1500,
        tiers: [
          {
            name: 'Premium',
            basePrice: 200,
            color: '#GOLD',
            minPerTeam: 1,
            maxPerTeam: 2,
          },
        ],
        currencyName: 'Points',
        currencyIcon: '⭐',
      }

      act(() => {
        result.current.applyPreset(preset)
      })

      expect(result.current.formState.config.budgetPerTeam).toBe(1500)
      expect(result.current.formState.config.currencyName).toBe('Points')
      expect(result.current.formState.config.currencyIcon).toBe('⭐')
      expect(result.current.formState.tiers).toEqual(preset.tiers)
    })
  })

  describe('Form Submission', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should submit auction successfully', async () => {
      const mockResponse = { id: 'auction-123' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useWizardForm())

      await act(async () => {
        const response = await result.current.submitAuction()
        expect(response).toEqual(mockResponse)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auction/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicInfo: result.current.formState.basicInfo,
          leagueId: result.current.formState.organizationSelect?.leagueId,
          config: result.current.formState.config,
          teams: result.current.formState.teams,
          tiers: result.current.formState.tiers,
        }),
      })

      expect(mockPush).toHaveBeenCalledWith('/auction/auction-123')
    })

    it('should handle submission failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      })

      const { result } = renderHook(() => useWizardForm())

      await expect(act(async () => {
        await result.current.submitAuction()
      })).rejects.toThrow('Failed to create auction')

      expect(result.current.isLoading).toBe(false)
    })

    it('should handle fetch errors during submission', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useWizardForm())

      await expect(act(async () => {
        await result.current.submitAuction()
      })).rejects.toThrow('Network error')
    })
  })

  describe('Validation Helpers', () => {
    it('should get current step validation status', () => {
      const { result } = renderHook(() => useWizardForm())

      const validation = result.current.getCurrentStepValidation()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toEqual({})
    })

    it('should check if can proceed', () => {
      const { result } = renderHook(() => useWizardForm())

      const canProceed = result.current.canProceed()
      expect(canProceed).toBe(true)
    })
  })
})
