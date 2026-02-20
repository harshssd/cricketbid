'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { WizardFormStateData, validateStep } from '@/lib/validations/auction'
import { AuctionConfig, TierConfig, BrandingConfig } from '@/lib/types'
import { DEFAULT_TIERS } from '@/lib/config-presets'

const STORAGE_KEY = 'cricketbid-wizard-draft'

// Initial form state
const initialFormState: WizardFormStateData = {
  currentStep: 0,
  setupMode: undefined,
  basicInfo: {},
  organizationSelect: {
    creationType: 'STANDALONE'
  },
  config: {
    budgetPerTeam: 1000,
    currencyName: 'Coins',
    currencyIcon: '🪙',
    squadSize: 11,
    numTeams: 4
  },
  teams: [],
  tiers: [],
  branding: {
    primaryColor: '#1B2A4A',
    secondaryColor: '#3B82F6',
    font: 'system'
  },
  isDraft: true,
  lastModified: new Date().toISOString()
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useWizardForm() {
  const [formState, setFormState] = useState<WizardFormStateData>(initialFormState)
  const [draftAuctionId, setDraftAuctionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const router = useRouter()

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsedState = JSON.parse(saved)
        // Convert date strings back to Date objects
        if (parsedState.basicInfo?.scheduledAt) {
          parsedState.basicInfo.scheduledAt = new Date(parsedState.basicInfo.scheduledAt)
        }
        if (parsedState._draftAuctionId) {
          setDraftAuctionId(parsedState._draftAuctionId)
        }
        setFormState({ ...initialFormState, ...parsedState })
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Auto-save to localStorage
  const saveDraft = useCallback((state: WizardFormStateData, auctionId?: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        _draftAuctionId: auctionId ?? draftAuctionId
      }))
    } catch (error) {
      console.error('Failed to save draft to localStorage:', error)
    }
  }, [draftAuctionId])

  // Update form state and auto-save aggressively
  const updateFormState = useCallback((updates: Partial<WizardFormStateData>) => {
    setFormState(prev => {
      const newState = {
        ...prev,
        ...updates,
        lastModified: new Date().toISOString()
      }
      saveDraft(newState)
      return newState
    })
  }, [saveDraft])

  // Navigate to specific step
  const goToStep = useCallback((step: number) => {
    updateFormState({ currentStep: step })
    setErrors({})
  }, [updateFormState])

  // Navigate to next step with validation
  const nextStep = useCallback((stepData?: any, schema?: any) => {
    if (schema && stepData) {
      const validation = validateStep(stepData, schema)
      if (!validation.isValid) {
        setErrors(validation.errors)
        return false
      }
      setErrors({})
    }

    const nextStepNumber = formState.currentStep + 1
    updateFormState({ currentStep: nextStepNumber })
    return true
  }, [formState.currentStep, updateFormState])

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (formState.currentStep > 0) {
      updateFormState({ currentStep: formState.currentStep - 1 })
      setErrors({})
    }
  }, [formState.currentStep, updateFormState])

  // Update specific form section with aggressive auto-save
  const updateSection = useCallback(<T extends keyof WizardFormStateData>(
    section: T,
    data: Partial<WizardFormStateData[T]>
  ) => {
    // For array sections (teams, tiers), replace the value directly
    if (Array.isArray(data)) {
      updateFormState({ [section]: data })
    } else {
      updateFormState({
        [section]: { ...(formState[section] as any), ...(data as any) }
      })
    }
  }, [formState, updateFormState])

  // Check if draft exists and get draft info
  const getDraftInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsedState = JSON.parse(saved)
        return {
          exists: true,
          lastModified: parsedState.lastModified || new Date().toISOString(),
          currentStep: parsedState.currentStep || 0,
          hasData: !!(
            (parsedState.basicInfo && Object.keys(parsedState.basicInfo).length > 0 && parsedState.basicInfo.name) ||
            (parsedState.teams && parsedState.teams.length > 0) ||
            (parsedState.tiers && parsedState.tiers.length > 0)
          )
        }
      }
    } catch (error) {
      console.error('Failed to check draft info:', error)
    }
    return { exists: false }
  }, [])

  // Load saved draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsedState = JSON.parse(saved)
        if (parsedState.basicInfo?.scheduledAt) {
          parsedState.basicInfo.scheduledAt = new Date(parsedState.basicInfo.scheduledAt)
        }
        if (parsedState._draftAuctionId) {
          setDraftAuctionId(parsedState._draftAuctionId)
        }
        setFormState({ ...initialFormState, ...parsedState })
        return true
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
      localStorage.removeItem(STORAGE_KEY)
    }
    return false
  }, [])

  // Load a draft from the server (Supabase) by auction ID
  const loadDraftFromServer = useCallback(async (auctionId: string) => {
    setIsLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('auctions')
        .select('id, name, description, wizard_state, budget_per_team, currency_name, currency_icon, squad_size, league_id, visibility, scheduled_at, timezone')
        .eq('id', auctionId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Draft not found')

      // If wizard_state exists, restore it directly
      if (data.wizard_state) {
        const wizardState = data.wizard_state as any
        if (wizardState.basicInfo?.scheduledAt) {
          wizardState.basicInfo.scheduledAt = new Date(wizardState.basicInfo.scheduledAt)
        }
        setFormState({ ...initialFormState, ...wizardState })
        setDraftAuctionId(auctionId)
        saveDraft({ ...initialFormState, ...wizardState }, auctionId)
        return true
      }

      // Fallback: reconstruct form state from DB columns
      const reconstructed: WizardFormStateData = {
        ...initialFormState,
        basicInfo: {
          name: data.name,
          description: data.description || undefined,
          scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
          timezone: data.timezone || undefined,
          visibility: data.visibility || 'PRIVATE',
        },
        config: {
          budgetPerTeam: data.budget_per_team,
          currencyName: data.currency_name,
          currencyIcon: data.currency_icon,
          squadSize: data.squad_size,
          numTeams: 4,
        },
      }
      setFormState(reconstructed)
      setDraftAuctionId(auctionId)
      saveDraft(reconstructed, auctionId)
      return true
    } catch (error) {
      console.error('Failed to load draft from server:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [saveDraft])

  // Initialize teams based on team count
  const initializeTeams = useCallback((teamCount: number) => {
    const defaultColors = [
      { primary: '#3B82F6', secondary: '#1B2A4A' },
      { primary: '#EF4444', secondary: '#7F1D1D' },
      { primary: '#10B981', secondary: '#064E3B' },
      { primary: '#F59E0B', secondary: '#78350F' },
      { primary: '#8B5CF6', secondary: '#3730A3' },
      { primary: '#EC4899', secondary: '#7C2D12' },
      { primary: '#06B6D4', secondary: '#0C4A6E' },
      { primary: '#84CC16', secondary: '#365314' },
    ]

    const teams = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      primaryColor: defaultColors[index % defaultColors.length].primary,
      secondaryColor: defaultColors[index % defaultColors.length].secondary,
      logo: undefined,
      captainEmail: undefined
    }))

    updateFormState({ teams })
  }, [updateFormState])

  // Initialize tiers with defaults
  const initializeTiers = useCallback((customTiers?: TierConfig[]) => {
    const tiers = customTiers || DEFAULT_TIERS.map(tier => ({
      ...tier,
      sortOrder: DEFAULT_TIERS.indexOf(tier)
    }))
    updateFormState({ tiers })
  }, [updateFormState])

  // Apply configuration preset
  const applyPreset = useCallback((preset: {
    budgetPerTeam: number
    tiers: TierConfig[]
    currencyName?: string
    currencyIcon?: string
  }) => {
    updateFormState({
      config: {
        ...formState.config,
        budgetPerTeam: preset.budgetPerTeam,
        currencyName: preset.currencyName || formState.config?.currencyName || 'Coins',
        currencyIcon: preset.currencyIcon || formState.config?.currencyIcon || '🪙'
      },
      tiers: preset.tiers
    })
  }, [formState.config, updateFormState])

  // Apply wizard recommendations
  const applyWizardRecommendation = useCallback((recommendation: {
    config: AuctionConfig
    tiers: TierConfig[]
    explanation: string
  }) => {
    updateFormState({
      config: recommendation.config,
      tiers: recommendation.tiers.map((tier, index) => ({
        ...tier,
        sortOrder: index
      }))
    })
    setTimeout(() => {
      updateFormState({ currentStep: formState.currentStep + 1 })
    }, 100)
  }, [updateFormState, formState.currentStep])

  // Submit auction for creation
  const submitAuction = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auction/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          basicInfo: formState.basicInfo,
          config: formState.config,
          teams: formState.teams,
          tiers: formState.tiers,
          branding: formState.branding
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create auction')
      }

      const result = await response.json()

      // Clear the draft
      localStorage.removeItem(STORAGE_KEY)
      setDraftAuctionId(null)

      // Redirect to the created auction
      router.push(`/auction/${result.id}`)

      return result
    } catch (error) {
      console.error('Failed to create auction:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [formState, router])

  // Save draft to Supabase
  const saveDraftToServer = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const auctionName = formState.basicInfo?.name || 'Untitled Auction'
      const now = new Date().toISOString()

      // Prepare the wizard state to store (strip Date objects for JSON)
      const wizardStateToStore = {
        ...formState,
        basicInfo: {
          ...formState.basicInfo,
          scheduledAt: formState.basicInfo?.scheduledAt
            ? (formState.basicInfo.scheduledAt as Date).toISOString?.() || formState.basicInfo.scheduledAt
            : undefined
        }
      }

      const auctionRow = {
        name: auctionName,
        description: formState.basicInfo?.description || null,
        owner_id: user.id,
        status: 'DRAFT' as const,
        visibility: formState.basicInfo?.visibility || 'PRIVATE',
        scheduled_at: formState.basicInfo?.scheduledAt
          ? (formState.basicInfo.scheduledAt as Date).toISOString?.() || formState.basicInfo.scheduledAt
          : null,
        timezone: formState.basicInfo?.timezone || null,
        league_id: formState.organizationSelect?.creationType === 'LEAGUE'
          ? formState.organizationSelect?.organizationId || null
          : null,
        is_standalone: formState.organizationSelect?.creationType === 'STANDALONE',
        budget_per_team: formState.config?.budgetPerTeam || 1000,
        currency_name: formState.config?.currencyName || 'Coins',
        currency_icon: formState.config?.currencyIcon || '🪙',
        squad_size: formState.config?.squadSize || 11,
        primary_color: formState.branding?.primaryColor || '#1B2A4A',
        secondary_color: formState.branding?.secondaryColor || '#3B82F6',
        font: formState.branding?.font || 'system',
        wizard_state: wizardStateToStore,
        updated_at: now,
      }

      if (draftAuctionId) {
        // Update existing draft
        const { error } = await supabase
          .from('auctions')
          .update(auctionRow)
          .eq('id', draftAuctionId)

        if (error) throw error
      } else {
        // Insert new draft
        const { data, error } = await supabase
          .from('auctions')
          .insert(auctionRow)
          .select('id')
          .single()

        if (error) throw error
        setDraftAuctionId(data.id)
        // Update localStorage with the new auction ID
        saveDraft(formState, data.id)
      }

      updateFormState({ isDraft: true })
      return { success: true }
    } catch (error) {
      console.error('Failed to save draft:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [formState, draftAuctionId, saveDraft, updateFormState])

  // Clear form and start fresh
  const resetForm = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setFormState(initialFormState)
    setDraftAuctionId(null)
    setErrors({})
  }, [])

  // Get validation status for current step
  const getCurrentStepValidation = useCallback(() => {
    return { isValid: true, errors: {} }
  }, [])

  // Check if we can proceed to next step
  const canProceed = useCallback(() => {
    const validation = getCurrentStepValidation()
    return validation.isValid
  }, [getCurrentStepValidation])

  return {
    // State
    formState,
    draftAuctionId,
    errors,
    isLoading,

    // Navigation
    goToStep,
    nextStep,
    prevStep,
    canProceed,

    // Form updates
    updateSection,
    updateFormState,

    // Draft management
    getDraftInfo,
    loadDraft,
    loadDraftFromServer,
    saveDraft,

    // Initialization helpers
    initializeTeams,
    initializeTiers,
    applyPreset,
    applyWizardRecommendation,

    // Actions
    submitAuction,
    saveDraftToServer,
    resetForm,

    // Validation
    getCurrentStepValidation
  }
}
