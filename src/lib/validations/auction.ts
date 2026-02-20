import { z } from 'zod'
import { AuctionCreationType } from '@/lib/types'

// Basic auction information validation
export const basicInfoSchema = z.object({
  name: z.string().min(3, 'Auction name must be at least 3 characters').max(100, 'Auction name must be less than 100 characters'),
  description: z.string().optional(),
  scheduledAt: z.union([z.date(), z.string()]).optional().transform((val) => val ? new Date(val) : undefined),
  timezone: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  passcode: z.string().optional(),
})

// Organization selection validation
export const organizationSelectSchema = z.object({
  creationType: z.enum(['STANDALONE', 'LEAGUE']),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  organizationCode: z.string().optional(),
  organizationType: z.enum(['league']).optional(),
  inheritBranding: z.boolean().default(false),
  restrictToMembers: z.boolean().default(false),
})

// Configuration wizard inputs validation
export const wizardInputsSchema = z.object({
  playerCount: z.number().min(8, 'Need at least 8 players').max(200, 'Maximum 200 players supported'),
  teamCount: z.number().min(2, 'Need at least 2 teams').max(12, 'Maximum 12 teams supported'),
  skillSpread: z.enum(['MOSTLY_EVEN', 'SOME_STARS', 'WIDE_RANGE']),
  competitiveness: z.enum(['CASUAL', 'MODERATE', 'HIGHLY_COMPETITIVE']),
  duration: z.enum(['UNDER_1HR', 'ONE_TO_TWO_HRS', 'NO_RUSH']),
})

// Manual auction configuration validation
export const auctionConfigSchema = z.object({
  budgetPerTeam: z.number().min(100, 'Budget must be at least 100').max(10000, 'Maximum budget is 10,000'),
  currencyName: z.string().min(1, 'Currency name is required').max(20, 'Currency name too long'),
  currencyIcon: z.string().min(1, 'Currency icon is required'),
  squadSize: z.number().min(5, 'Squad size must be at least 5').max(18, 'Maximum squad size is 18'),
  numTeams: z.number().min(2, 'Need at least 2 teams').max(12, 'Maximum 12 teams'),

  // Transparency & Visibility Settings
  tiersVisible: z.enum(['ORGANIZERS_ONLY', 'CAPTAINS_AND_ORGANIZERS', 'PUBLIC']).default('ORGANIZERS_ONLY'),
  bidAmountsVisible: z.enum(['HIDDEN', 'AFTER_BIDDING', 'REAL_TIME']).default('HIDDEN'),
  showPlayerStats: z.boolean().default(true),
  allowBidComments: z.boolean().default(false),
  enableNominations: z.boolean().default(false),

  // Bidding Time Management
  biddingTimeLimit: z.number().min(30, 'Bidding time must be at least 30 seconds').max(600, 'Maximum bidding time is 10 minutes').default(120),
  enableExtendedTime: z.boolean().default(true),
  extendedTimeSeconds: z.number().min(10, 'Extended time must be at least 10 seconds').max(120, 'Maximum extended time is 2 minutes').default(30),

  // Auto-bid System
  allowAutoBidding: z.boolean().default(false),
  autoBidIncrement: z.number().min(1, 'Auto-bid increment must be at least 1').max(100, 'Maximum auto-bid increment is 100').default(5),
  maxAutoBidRounds: z.number().min(1, 'Must allow at least 1 auto-bid round').max(10, 'Maximum 10 auto-bid rounds').default(3),

  // Player Sale Policy
  allowUnsoldPlayers: z.boolean().default(true),
  mandatoryBidding: z.boolean().default(false),
  unsoldPlayerAction: z.enum(['REMOVE', 'BACKLOG', 'REDUCE_PRICE']).default('BACKLOG'),
  minimumBidRequired: z.boolean().default(true),

  // Team Squad Balance
  enforceSquadBalance: z.boolean().default(false),
  maxSquadImbalance: z.number().min(1, 'Maximum imbalance must be at least 1 player').max(5, 'Maximum imbalance cannot exceed 5 players').default(2),
  allowFlexibleSquadSizes: z.boolean().default(true),
})

// Team configuration validation
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name too long'),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  logo: z.string().url().optional(),
  captainEmail: z.string().email('Invalid email format').optional(),
})

export const teamsSchema = z.array(teamSchema).min(2, 'At least 2 teams required')

// Tier configuration validation (without refinement for partial support)
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

// Branding configuration validation
export const brandingSchema = z.object({
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  bgImage: z.string().url().optional(),
  font: z.string().min(1, 'Font selection required'),
  themePreset: z.string().optional(),
  tagline: z.string().max(100, 'Tagline too long').optional(),
})

// Complete auction creation validation
export const createAuctionSchema = z.object({
  basicInfo: basicInfoSchema,
  config: auctionConfigSchema,
  teams: teamsSchema,
  tiers: tiersSchema,
  branding: brandingSchema,
})

// Wizard form state validation (without refinements for partial support)
export const wizardFormStateSchema = z.object({
  currentStep: z.number().min(0).max(10),
  setupMode: z.enum(['WIZARD', 'MANUAL']).optional(),
  basicInfo: basicInfoSchema.partial(),
  organizationSelect: organizationSelectSchema.partial(),
  wizardInputs: wizardInputsSchema.optional(),
  config: auctionConfigSchema.partial(),
  teams: z.array(teamSchema.partial()).optional(),
  tiers: z.array(tierSchemaBase.partial()).optional(), // Use base schema for partial
  branding: brandingSchema.partial(),
  isDraft: z.boolean().default(true),
  lastModified: z.string().optional(),
})

// Export types
export type BasicInfoFormData = z.infer<typeof basicInfoSchema>
export type OrganizationSelectFormData = z.infer<typeof organizationSelectSchema>
export type WizardInputsFormData = z.infer<typeof wizardInputsSchema>
export type AuctionConfigFormData = z.infer<typeof auctionConfigSchema>
export type TeamFormData = z.infer<typeof teamSchema>
export type TeamsFormData = z.infer<typeof teamsSchema>
export type TierFormData = z.infer<typeof tierSchema>
export type TiersFormData = z.infer<typeof tiersSchema>
export type BrandingFormData = z.infer<typeof brandingSchema>
export type CreateAuctionFormData = z.infer<typeof createAuctionSchema>
export type WizardFormStateData = z.infer<typeof wizardFormStateSchema>

// Validation helper functions
export function validateStep(stepData: any, stepSchema: z.ZodSchema): {
  isValid: boolean
  errors: Record<string, string[]>
  data?: any
} {
  try {
    const validatedData = stepSchema.parse(stepData)
    return {
      isValid: true,
      errors: {},
      data: validatedData
    }
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
      return {
        isValid: false,
        errors
      }
    }
    return {
      isValid: false,
      errors: { general: ['Validation failed'] }
    }
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

  // Check if squad size is achievable
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