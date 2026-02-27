import { z } from 'zod'

// Basic auction information validation
export const basicInfoSchema = z.object({
  name: z.string().min(3, 'Auction name must be at least 3 characters').max(100, 'Auction name must be less than 100 characters'),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
})

// Organization selection validation — league is required
export const organizationSelectSchema = z.object({
  leagueId: z.string().min(1, 'League is required'),
  leagueName: z.string().optional(),
})

// Open outcry increment rule validation
export const outcryRuleSchema = z.object({
  from_multiplier: z.number().min(0, 'From multiplier must be >= 0'),
  to_multiplier: z.number().min(0, 'To multiplier must be > 0'),
  increment: z.number().min(1, 'Increment must be at least 1'),
})

// Open outcry configuration validation
export const outcryConfigSchema = z.object({
  rules: z.array(outcryRuleSchema).min(1, 'At least 1 increment rule required'),
  timer_seconds: z.number().min(5, 'Timer must be at least 5 seconds').max(120, 'Timer max 120 seconds').nullable(),
})

// Bidding type enum
export const biddingTypeSchema = z.enum(['SEALED_TENDER', 'OPEN_OUTCRY'])

// Manual auction configuration validation
export const auctionConfigSchema = z.object({
  budgetPerTeam: z.number().min(100, 'Budget must be at least 100').max(10000, 'Maximum budget is 10,000'),
  currencyName: z.string().min(1, 'Currency name is required').max(20, 'Currency name too long'),
  currencyIcon: z.string().min(1, 'Currency icon is required'),
  squadSize: z.number().min(5, 'Squad size must be at least 5').max(18, 'Maximum squad size is 18'),
  numTeams: z.number().min(2, 'Need at least 2 teams').max(12, 'Maximum 12 teams'),
  biddingType: biddingTypeSchema.default('SEALED_TENDER'),
  outcryConfig: outcryConfigSchema.optional(),
})

// Team configuration validation
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name too long'),
  captainEmail: z.string().email('Invalid email format').optional(),
})

export const teamsSchema = z.array(teamSchema).min(2, 'At least 2 teams required')

// Tier configuration validation
export const tierSchemaBase = z.object({
  name: z.string().min(1, 'Tier name is required').max(30, 'Tier name too long'),
  basePrice: z.number().min(1, 'Base price must be at least 1'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().optional(),
  minPerTeam: z.number().min(0, 'Minimum cannot be negative').max(18, 'Minimum too high').optional(),
  maxPerTeam: z.number().min(1, 'Maximum must be at least 1').max(18, 'Maximum too high').optional(),
})

export const tierSchema = tierSchemaBase.refine(data => {
  if (data.minPerTeam != null && data.maxPerTeam != null && data.maxPerTeam < data.minPerTeam) {
    return false
  }
  return true
}, {
  message: 'Maximum must be greater than minimum',
  path: ['maxPerTeam']
})

export const tiersSchema = z.array(tierSchema).min(2, 'At least 2 tiers required').max(6, 'Maximum 6 tiers allowed')

// Complete auction creation validation
export const createAuctionSchema = z.object({
  basicInfo: basicInfoSchema,
  leagueId: z.string().min(1, 'League is required'),
  config: auctionConfigSchema,
  teams: teamsSchema,
  tiers: tiersSchema,
})

// Wizard form state validation
export const wizardFormStateSchema = z.object({
  currentStep: z.number().min(0).max(10),
  basicInfo: basicInfoSchema.partial(),
  organizationSelect: organizationSelectSchema.partial(),
  config: auctionConfigSchema.partial(),
  teams: z.array(teamSchema.partial()).optional(),
  tiers: z.array(tierSchemaBase.partial()).optional(),
  lastModified: z.string().optional(),
})

// Export types
export type BasicInfoFormData = z.infer<typeof basicInfoSchema>
export type OrganizationSelectFormData = z.infer<typeof organizationSelectSchema>
export type AuctionConfigFormData = z.infer<typeof auctionConfigSchema>
export type TeamFormData = z.infer<typeof teamSchema>
export type TeamsFormData = z.infer<typeof teamsSchema>
export type TierFormData = z.infer<typeof tierSchema>
export type TiersFormData = z.infer<typeof tiersSchema>
export type CreateAuctionFormData = z.infer<typeof createAuctionSchema>
export type WizardFormStateData = z.infer<typeof wizardFormStateSchema>
export type BiddingType = z.infer<typeof biddingTypeSchema>
export type OutcryConfigFormData = z.infer<typeof outcryConfigSchema>
export type OutcryRuleFormData = z.infer<typeof outcryRuleSchema>

// Validation helper functions
export function validateStep(stepData: any, stepSchema: z.ZodSchema): {
  isValid: boolean
  errors: Record<string, string[]>
  data?: any
} {
  try {
    const validatedData = stepSchema.parse(stepData)
    return { isValid: true, errors: {}, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.issues.forEach((err) => {
        const path = err.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })
      return { isValid: false, errors }
    }
    return { isValid: false, errors: { general: ['Validation failed'] } }
  }
}

// Budget validation helper
export function validateBudgetConstraints(config: AuctionConfigFormData, tiers: TiersFormData): {
  isValid: boolean
  warnings: string[]
  flexibility: number
} {
  const totalMinCost = tiers.reduce((sum, tier) => {
    return sum + (tier.basePrice * (tier.minPerTeam || 0))
  }, 0)

  const flexibility = ((config.budgetPerTeam - totalMinCost) / config.budgetPerTeam) * 100
  const warnings: string[] = []

  if (flexibility < 10) {
    warnings.push('Very tight budget - captains will have minimal bidding flexibility')
  } else if (flexibility > 80) {
    warnings.push('Very loose budget - consider increasing base prices or reducing budget')
  }

  if (totalMinCost > config.budgetPerTeam) {
    warnings.push('Minimum tier requirements exceed team budget!')
    return { isValid: false, warnings, flexibility }
  }

  const minPlayersRequired = tiers.reduce((sum, tier) => sum + (tier.minPerTeam || 0), 0)
  if (minPlayersRequired > config.squadSize) {
    warnings.push('Tier minimums require more players than squad size allows')
    return { isValid: false, warnings, flexibility }
  }

  return {
    isValid: true,
    warnings,
    flexibility: Math.round(flexibility * 10) / 10
  }
}
