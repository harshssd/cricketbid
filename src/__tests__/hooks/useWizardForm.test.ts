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
  const STORAGE_KEY = 'cricketbid-wizard-draft'

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    mockValidateStep.mockClear()
    mockPush.mockClear()

    // Set up successful validation by default
    mockValidateStep.mockReturnValue({
      isValid: true,
      errors: {},
      data: {},
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should initialize with default form state', () => {
      const { result } = renderHook(() => useWizardForm())

      expect(result.current.formState.currentStep).toBe(0)
      expect(result.current.formState.isDraft).toBe(true)
      expect(result.current.formState.basicInfo).toEqual({})
      expect(result.current.formState.config.budgetPerTeam).toBe(1000)
      expect(result.current.formState.config.currencyName).toBe('Coins')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.errors).toEqual({})
    })

    it('should load saved draft from localStorage on mount', () => {
      const savedState = {
        currentStep: 2,
        basicInfo: { name: 'Saved Auction' },
        config: { budgetPerTeam: 1500 },
        isDraft: true,
        lastModified: new Date().toISOString(),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))

      const { result } = renderHook(() => useWizardForm())

      expect(result.current.formState.currentStep).toBe(2)
      expect(result.current.formState.basicInfo.name).toBe('Saved Auction')
      expect(result.current.formState.config.budgetPerTeam).toBe(1500)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json')

      const { result } = renderHook(() => useWizardForm())

      // Should fall back to initial state
      expect(result.current.formState.currentStep).toBe(0)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('should convert date strings back to Date objects when loading', () => {
      const savedState = {
        currentStep: 1,
        basicInfo: {
          name: 'Test Auction',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        },
        isDraft: true,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))

      const { result } = renderHook(() => useWizardForm())

      expect(result.current.formState.basicInfo.scheduledAt).toBeInstanceOf(Date)
    })
  })

  describe('Form State Updates', () => {
    it('should update form state and auto-save', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateFormState({
          currentStep: 1,
          basicInfo: { name: 'Updated Auction' },
        })
      })

      expect(result.current.formState.currentStep).toBe(1)
      expect(result.current.formState.basicInfo.name).toBe('Updated Auction')

      // Should auto-save to localStorage
      const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(savedData.currentStep).toBe(1)
      expect(savedData.basicInfo.name).toBe('Updated Auction')
      expect(savedData.lastModified).toBeDefined()
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

  describe('Draft Management', () => {
    it('should get draft info when draft exists', () => {
      const savedState = {
        currentStep: 3,
        basicInfo: { name: 'Draft Auction' },
        config: { budgetPerTeam: 1200 },
        teams: [{ name: 'Team 1' }],
        lastModified: new Date().toISOString(),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))

      const { result } = renderHook(() => useWizardForm())

      const draftInfo = result.current.getDraftInfo()
      expect(draftInfo.exists).toBe(true)
      expect(draftInfo.currentStep).toBe(3)
      expect(draftInfo.hasData).toBe(true)
      expect(draftInfo.lastModified).toBeDefined()
    })

    it('should return false for draft info when no draft exists', () => {
      const { result } = renderHook(() => useWizardForm())

      const draftInfo = result.current.getDraftInfo()
      expect(draftInfo.exists).toBe(false)
    })

    it('should load draft successfully', () => {
      const savedState = {
        currentStep: 2,
        basicInfo: { name: 'Load Test' },
        isDraft: true,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))

      const { result } = renderHook(() => useWizardForm())

      const loaded = result.current.loadDraft()
      expect(loaded).toBe(true)
      expect(result.current.formState.basicInfo.name).toBe('Load Test')
    })

    it('should reset form and clear localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ test: 'data' }))

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
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('Team and Tier Initialization', () => {
    it('should initialize teams with default colors', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.initializeTeams(4)
      })

      expect(result.current.formState.teams).toHaveLength(4)
      expect(result.current.formState.teams?.[0].name).toBe('Team 1')
      expect(result.current.formState.teams?.[0].primaryColor).toBeDefined()
      expect(result.current.formState.teams?.[1].name).toBe('Team 2')
    })

    it('should cycle through default colors for many teams', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.initializeTeams(10)
      })

      expect(result.current.formState.teams).toHaveLength(10)

      // Colors should cycle - teams 0 and 8 should have same colors (8 default colors)
      expect(result.current.formState.teams?.[0].primaryColor)
        .toBe(result.current.formState.teams?.[8].primaryColor)
    })

    it('should initialize tiers with defaults', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.initializeTiers()
      })

      expect(result.current.formState.tiers).toBeDefined()
      expect(result.current.formState.tiers?.length).toBeGreaterThan(0)
      expect(result.current.formState.tiers?.[0].name).toBe('Platinum')
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

    it('should apply wizard recommendation and advance step', async () => {
      const { result } = renderHook(() => useWizardForm())

      const recommendation = {
        config: {
          budgetPerTeam: 1200,
          currencyName: 'Coins',
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: 4,
        },
        tiers: [
          {
            name: 'Star',
            basePrice: 150,
            color: '#STAR',
            minPerTeam: 1,
            maxPerTeam: 2,
          },
        ],
        explanation: 'Test recommendation',
      }

      const currentStep = result.current.formState.currentStep

      await act(async () => {
        result.current.applyWizardRecommendation(recommendation)
        // Wait for setTimeout
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(result.current.formState.config).toEqual(recommendation.config)
      expect(result.current.formState.tiers?.[0]).toEqual({
        ...recommendation.tiers[0],
        sortOrder: 0,
      })
      expect(result.current.formState.currentStep).toBe(currentStep + 1)
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
          config: result.current.formState.config,
          teams: result.current.formState.teams,
          tiers: result.current.formState.tiers,
          branding: result.current.formState.branding,
        }),
      })

      expect(mockPush).toHaveBeenCalledWith('/auction/auction-123')
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull() // Draft should be cleared
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

    it('should save draft to server', async () => {
      const mockResponse = { id: 'draft-123' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useWizardForm())

      await act(async () => {
        const response = await result.current.saveDraftToServer()
        expect(response).toEqual(mockResponse)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auction/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.current.formState),
      })

      expect(result.current.formState.isDraft).toBe(true)
    })
  })

  describe('Auto-save Behavior', () => {
    it('should auto-save on every form state change', () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateFormState({ currentStep: 1 })
      })

      let savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(savedData.currentStep).toBe(1)

      act(() => {
        result.current.updateSection('basicInfo', { name: 'Auto Save Test' })
      })

      savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(savedData.basicInfo.name).toBe('Auto Save Test')
      expect(savedData.lastModified).toBeDefined()
    })

    it('should handle localStorage write errors gracefully', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage full')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() => useWizardForm())

      // This should not throw
      act(() => {
        result.current.updateFormState({ currentStep: 1 })
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save draft to localStorage:', expect.any(Error))

      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
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

  describe('Error Handling', () => {
    it('should handle JSON parse errors when loading draft', () => {
      localStorage.setItem(STORAGE_KEY, '{ invalid json }')

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() => useWizardForm())

      // Should initialize with defaults
      expect(result.current.formState.currentStep).toBe(0)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull() // Should clear corrupted data

      consoleSpy.mockRestore()
    })

    it('should handle fetch errors during submission', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useWizardForm())

      await expect(act(async () => {
        await result.current.submitAuction()
      })).rejects.toThrow('Network error')
    })
  })
})