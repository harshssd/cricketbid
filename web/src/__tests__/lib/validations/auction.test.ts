import {
  basicInfoSchema,
  organizationSelectSchema,
  auctionConfigSchema,
  teamSchema,
  teamsSchema,
  tierSchema,
  tierSchemaBase,
  tiersSchema,
  createAuctionSchema,
  wizardFormStateSchema,
  validateStep,
  validateBudgetConstraints,
  type AuctionConfigFormData,
  type TiersFormData,
} from '@/lib/validations/auction'

describe('Auction Validation Schemas', () => {
  describe('basicInfoSchema', () => {
    const validBasicInfo = {
      name: 'Test Auction',
      description: 'A test auction',
      visibility: 'PUBLIC' as const,
    }

    it('should validate correct basic info', () => {
      const result = basicInfoSchema.safeParse(validBasicInfo)
      expect(result.success).toBe(true)
    })

    it('should reject auction name shorter than 3 characters', () => {
      const result = basicInfoSchema.safeParse({
        ...validBasicInfo,
        name: 'Ab',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Auction name must be at least 3 characters')
      }
    })

    it('should reject auction name longer than 100 characters', () => {
      const result = basicInfoSchema.safeParse({
        ...validBasicInfo,
        name: 'A'.repeat(101),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Auction name must be less than 100 characters')
      }
    })

    it('should reject invalid visibility values', () => {
      const result = basicInfoSchema.safeParse({
        ...validBasicInfo,
        visibility: 'INVALID',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const result = basicInfoSchema.safeParse({
        name: 'Test Auction',
        visibility: 'PUBLIC' as const,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('organizationSelectSchema', () => {
    const validOrgSelect = {
      leagueId: 'league-123',
      leagueName: 'Test League',
    }

    it('should validate correct organization selection', () => {
      const result = organizationSelectSchema.safeParse(validOrgSelect)
      expect(result.success).toBe(true)
    })

    it('should require leagueId', () => {
      const result = organizationSelectSchema.safeParse({
        leagueId: '',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional leagueName', () => {
      const result = organizationSelectSchema.safeParse({
        leagueId: 'league-123',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('auctionConfigSchema', () => {
    const validConfig = {
      budgetPerTeam: 1000,
      currencyName: 'Coins',
      currencyIcon: '🪙',
      squadSize: 11,
      numTeams: 4,
    }

    it('should validate correct auction config', () => {
      const result = auctionConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('should reject budget below minimum', () => {
      const result = auctionConfigSchema.safeParse({
        ...validConfig,
        budgetPerTeam: 99,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Budget must be at least 100')
      }
    })

    it('should reject budget above maximum', () => {
      const result = auctionConfigSchema.safeParse({
        ...validConfig,
        budgetPerTeam: 10001,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Maximum budget is 10,000')
      }
    })

    it('should reject empty currency name', () => {
      const result = auctionConfigSchema.safeParse({
        ...validConfig,
        currencyName: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Currency name is required')
      }
    })

    it('should reject currency name too long', () => {
      const result = auctionConfigSchema.safeParse({
        ...validConfig,
        currencyName: 'A'.repeat(21),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Currency name too long')
      }
    })

    it('should apply default biddingType correctly', () => {
      const result = auctionConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.biddingType).toBe('SEALED_TENDER')
      }
    })
  })

  describe('teamSchema', () => {
    const validTeam = {
      name: 'Test Team',
      captainEmail: 'captain@example.com',
    }

    it('should validate correct team data', () => {
      const result = teamSchema.safeParse(validTeam)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const result = teamSchema.safeParse({
        ...validTeam,
        captainEmail: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format')
      }
    })

    it('should accept optional captainEmail', () => {
      const result = teamSchema.safeParse({
        name: 'Test Team',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('tierSchema', () => {
    const validTier = {
      name: 'Gold',
      basePrice: 100,
      color: '#FFD700',
      icon: '🏆',
      minPerTeam: 2,
      maxPerTeam: 4,
    }

    it('should validate correct tier data', () => {
      const result = tierSchema.safeParse(validTier)
      expect(result.success).toBe(true)
    })

    it('should reject when maxPerTeam is less than minPerTeam', () => {
      const result = tierSchema.safeParse({
        ...validTier,
        minPerTeam: 5,
        maxPerTeam: 3,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Maximum must be greater than minimum')
      }
    })

    it('should accept when maxPerTeam is undefined', () => {
      const result = tierSchema.safeParse({
        name: 'Gold',
        basePrice: 100,
        color: '#FFD700',
        minPerTeam: 2,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('tiersSchema', () => {
    const validTiers = [
      {
        name: 'Platinum',
        basePrice: 200,
        color: '#E5E4E2',
        minPerTeam: 1,
        maxPerTeam: 2,
      },
      {
        name: 'Gold',
        basePrice: 100,
        color: '#FFD700',
        minPerTeam: 2,
        maxPerTeam: 4,
      },
    ]

    it('should validate correct tiers array', () => {
      const result = tiersSchema.safeParse(validTiers)
      expect(result.success).toBe(true)
    })

    it('should reject less than 2 tiers', () => {
      const result = tiersSchema.safeParse([validTiers[0]])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least 2 tiers required')
      }
    })

    it('should reject more than 6 tiers', () => {
      const manyTiers = Array(7).fill(validTiers[0])
      const result = tiersSchema.safeParse(manyTiers)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Maximum 6 tiers allowed')
      }
    })
  })

  describe('validateStep function', () => {
    it('should return validation success for valid data', () => {
      const validData = {
        budgetPerTeam: 1000,
        currencyName: 'Coins',
        currencyIcon: '🪙',
        squadSize: 11,
        numTeams: 4,
      }

      const result = validateStep(validData, auctionConfigSchema)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
      expect(result.data).toBeDefined()
    })

    it('should return validation errors for invalid data', () => {
      const invalidData = {
        budgetPerTeam: 50, // Too low
        currencyName: '', // Empty
      }

      const result = validateStep(invalidData, auctionConfigSchema)
      expect(result.isValid).toBe(false)
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })

    it('should handle non-Zod errors gracefully', () => {
      const result = validateStep(null, null as any)
      expect(result.isValid).toBe(false)
      expect(result.errors).toEqual({ general: ['Validation failed'] })
    })
  })

  describe('validateBudgetConstraints function', () => {
    const validConfig: AuctionConfigFormData = {
      budgetPerTeam: 1000,
      currencyName: 'Coins',
      currencyIcon: '🪙',
      squadSize: 11,
      numTeams: 4,
      biddingType: 'SEALED_TENDER',
    }

    const validTiers: TiersFormData = [
      {
        name: 'Platinum',
        basePrice: 200,
        color: '#E5E4E2',
        minPerTeam: 1,
        maxPerTeam: 2,
      },
      {
        name: 'Gold',
        basePrice: 100,
        color: '#FFD700',
        minPerTeam: 2,
        maxPerTeam: 4,
      },
      {
        name: 'Silver',
        basePrice: 50,
        color: '#C0C0C0',
        minPerTeam: 3,
        maxPerTeam: 5,
      },
    ]

    it('should validate realistic budget constraints', () => {
      const result = validateBudgetConstraints(validConfig, validTiers)
      expect(result.isValid).toBe(true)
      expect(result.flexibility).toBeGreaterThan(0)
      expect(result.warnings).toBeDefined()
    })

    it('should warn about tight budget constraints', () => {
      const tightConfig = { ...validConfig, budgetPerTeam: 450 }
      const result = validateBudgetConstraints(tightConfig, validTiers)
      expect(result.warnings.some(w => w.includes('tight budget'))).toBe(true)
    })

    it('should warn about loose budget constraints', () => {
      const looseConfig = { ...validConfig, budgetPerTeam: 5000 }
      const result = validateBudgetConstraints(looseConfig, validTiers)
      expect(result.warnings.some(w => w.includes('loose budget'))).toBe(true)
    })

    it('should reject when minimum tier requirements exceed budget', () => {
      const impossibleConfig = { ...validConfig, budgetPerTeam: 300 }
      const result = validateBudgetConstraints(impossibleConfig, validTiers)
      expect(result.isValid).toBe(false)
      expect(result.warnings.some(w => w.includes('exceed team budget'))).toBe(true)
    })

    it('should reject when tier minimums exceed squad size', () => {
      const impossibleTiers: TiersFormData = [
        { ...validTiers[0], basePrice: 10, minPerTeam: 5 },
        { ...validTiers[1], basePrice: 10, minPerTeam: 5 },
        { ...validTiers[2], basePrice: 10, minPerTeam: 5 }, // Total: 15, but squad size is 11
      ]

      const result = validateBudgetConstraints(validConfig, impossibleTiers)
      expect(result.isValid).toBe(false)
      expect(result.warnings.some(w => w.includes('more players than squad size'))).toBe(true)
    })

    it('should calculate flexibility percentage correctly', () => {
      const result = validateBudgetConstraints(validConfig, validTiers)
      const minCost = validTiers.reduce((sum, tier) => sum + (tier.basePrice * (tier.minPerTeam || 0)), 0)
      const expectedFlexibility = ((validConfig.budgetPerTeam - minCost) / validConfig.budgetPerTeam) * 100

      expect(Math.abs(result.flexibility - Math.round(expectedFlexibility * 10) / 10)).toBeLessThan(0.1)
    })
  })

  describe('Complex Schema Combinations', () => {
    it('should validate complete auction creation data', () => {
      const completeData = {
        basicInfo: {
          name: 'Test Championship Auction',
          description: 'Annual cricket auction',
          visibility: 'PUBLIC' as const,
        },
        leagueId: 'league-123',
        config: {
          budgetPerTeam: 1000,
          currencyName: 'Coins',
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: 4,
        },
        teams: [
          { name: 'Team Alpha' },
          { name: 'Team Beta' },
        ],
        tiers: [
          { name: 'Platinum', basePrice: 200, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 2 },
          { name: 'Gold', basePrice: 100, color: '#FFD700', minPerTeam: 2, maxPerTeam: 4 },
        ],
      }

      const result = createAuctionSchema.safeParse(completeData)
      expect(result.success).toBe(true)
    })

    it('should validate wizard form state with partial data', () => {
      const wizardState = {
        currentStep: 2,
        basicInfo: {
          name: 'Partial Auction',
        },
        organizationSelect: {},
        config: {
          budgetPerTeam: 1000,
        },
        lastModified: new Date().toISOString(),
      }

      const result = wizardFormStateSchema.safeParse(wizardState)
      expect(result.success).toBe(true)
    })
  })
})
