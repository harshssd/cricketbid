'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WizardFormStateData, validateStep } from '@/lib/validations/auction'
import { AuctionConfig, TierConfig } from '@/lib/types'

// Initial form state
const initialFormState: WizardFormStateData = {
  currentStep: 0,
  basicInfo: {},
  organizationSelect: {
    leagueId: ''
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
  lastModified: new Date().toISOString()
}

export function useWizardForm() {
  const [formState, setFormState] = useState<WizardFormStateData>(initialFormState)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const router = useRouter()

  // Update form state
  const updateFormState = useCallback((updates: Partial<WizardFormStateData>) => {
    setFormState(prev => ({
      ...prev,
      ...updates,
      lastModified: new Date().toISOString()
    }))
  }, [])

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

  // Update specific form section
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

  // Initialize tiers
  const initializeTiers = useCallback((customTiers?: TierConfig[]) => {
    const tiers = customTiers || []
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
          leagueId: formState.organizationSelect?.leagueId,
          config: formState.config,
          teams: formState.teams,
          tiers: formState.tiers,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create auction')
      }

      const result = await response.json()

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

  // Clear form and start fresh
  const resetForm = useCallback(() => {
    setFormState(initialFormState)
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

    // Initialization helpers
    initializeTeams,
    initializeTiers,
    applyPreset,

    // Actions
    submitAuction,
    resetForm,

    // Validation
    getCurrentStepValidation
  }
}
