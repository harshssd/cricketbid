import { ConfigPreset, TierConfig } from './types'

// Default Tier Configurations
export const DEFAULT_TIERS: TierConfig[] = [
  {
    name: 'Platinum',
    basePrice: 100,
    color: '#E5E4E2',
    minPerTeam: 1,
    maxPerTeam: 2
  },
  {
    name: 'Gold',
    basePrice: 75,
    color: '#FFD700',
    minPerTeam: 2,
    maxPerTeam: 4
  },
  {
    name: 'Silver',
    basePrice: 50,
    color: '#C0C0C0',
    minPerTeam: 3
  },
  {
    name: 'Bronze',
    basePrice: 25,
    color: '#CD7F32',
    minPerTeam: 0
  }
]

// Configuration Presets
export const CONFIG_PRESETS: ConfigPreset[] = [
  {
    name: 'Balanced',
    description: 'Even spread, moderate strategy - perfect for most club leagues',
    style: 'Moderate competition with balanced team outcomes',
    budgetPerTeam: 1000,
    tiers: DEFAULT_TIERS,
    flexiblePercentage: 47.5,
    bestFor: 'Most club leagues and friendly competitions'
  },
  {
    name: 'Star Wars',
    description: 'Heavy top-tier bidding where stars define the teams',
    style: 'High-stakes bidding on premium players',
    budgetPerTeam: 1000,
    tiers: [
      { name: 'Platinum', basePrice: 50, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 2 },
      { name: 'Gold', basePrice: 25, color: '#FFD700', minPerTeam: 2, maxPerTeam: 4 },
      { name: 'Silver', basePrice: 15, color: '#C0C0C0', minPerTeam: 3 },
      { name: 'Bronze', basePrice: 10, color: '#CD7F32', minPerTeam: 0 }
    ],
    flexiblePercentage: 80.5,
    bestFor: 'Leagues where star players make all the difference'
  },
  {
    name: 'Parity League',
    description: 'Tight budget constraints for near-equal teams',
    style: 'Maximum competitive balance',
    budgetPerTeam: 1000,
    tiers: [
      { name: 'Platinum', basePrice: 150, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 2 },
      { name: 'Gold', basePrice: 100, color: '#FFD700', minPerTeam: 2, maxPerTeam: 4 },
      { name: 'Silver', basePrice: 50, color: '#C0C0C0', minPerTeam: 3 },
      { name: 'Bronze', basePrice: 20, color: '#CD7F32', minPerTeam: 0 }
    ],
    flexiblePercentage: 40,
    bestFor: 'When you want the most evenly matched teams possible'
  },
  {
    name: 'Open Market',
    description: 'Minimal constraints, maximum bidding freedom',
    style: 'Casual and fun with lots of strategic flexibility',
    budgetPerTeam: 1000,
    tiers: [
      { name: 'Platinum', basePrice: 25, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 3 },
      { name: 'Gold', basePrice: 15, color: '#FFD700', minPerTeam: 1, maxPerTeam: 5 },
      { name: 'Silver', basePrice: 10, color: '#C0C0C0', minPerTeam: 2 },
      { name: 'Bronze', basePrice: 5, color: '#CD7F32', minPerTeam: 0 }
    ],
    flexiblePercentage: 90.5,
    bestFor: 'Casual games and fun auctions with friends'
  },
  {
    name: 'IPL Style',
    description: 'High budgets with big gaps between tiers',
    style: 'Professional-level auction dynamics',
    budgetPerTeam: 2000,
    tiers: [
      { name: 'Platinum', basePrice: 200, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 3 },
      { name: 'Gold', basePrice: 100, color: '#FFD700', minPerTeam: 2, maxPerTeam: 5 },
      { name: 'Silver', basePrice: 50, color: '#C0C0C0', minPerTeam: 3 },
      { name: 'Bronze', basePrice: 20, color: '#CD7F32', minPerTeam: 0 }
    ],
    flexiblePercentage: 63,
    bestFor: 'Large pools (60+ players, 8+ teams) and premium tournaments'
  }
]

// Configuration Wizard Logic
export interface WizardInputs {
  playerCount: number
  teamCount: number
  skillSpread: 'MOSTLY_EVEN' | 'SOME_STARS' | 'WIDE_RANGE'
  competitiveness: 'CASUAL' | 'MODERATE' | 'HIGHLY_COMPETITIVE'
  duration: 'UNDER_1HR' | 'ONE_TO_TWO_HRS' | 'NO_RUSH'
}

export function generateRecommendation(inputs: WizardInputs): {
  config: {
    budgetPerTeam: number
    currencyName: string
    currencyIcon: string
    squadSize: number
    numTeams: number
  }
  tiers: TierConfig[]
  explanation: string
} {
  const { playerCount, teamCount, skillSpread, competitiveness, duration } = inputs
  const squadSize = Math.floor(playerCount / teamCount)

  // Base budget calculation
  let budgetPerTeam = 1000
  if (playerCount > 60) budgetPerTeam = 1500
  if (playerCount > 100) budgetPerTeam = 2000

  // Tier configuration based on skill spread
  let tiers: TierConfig[]
  if (skillSpread === 'MOSTLY_EVEN') {
    tiers = [
      { name: 'Premium', basePrice: 80, color: '#E5E4E2', minPerTeam: 2, maxPerTeam: 4 },
      { name: 'Regular', basePrice: 60, color: '#FFD700', minPerTeam: 4, maxPerTeam: 7 },
      { name: 'Emerging', basePrice: 40, color: '#C0C0C0', minPerTeam: Math.max(2, squadSize - 11) }
    ]
  } else if (skillSpread === 'WIDE_RANGE') {
    tiers = DEFAULT_TIERS
  } else {
    tiers = [
      { name: 'Stars', basePrice: 120, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 2 },
      { name: 'Core', basePrice: 80, color: '#FFD700', minPerTeam: 3, maxPerTeam: 5 },
      { name: 'Squad', basePrice: 50, color: '#C0C0C0', minPerTeam: 3 },
      { name: 'Depth', basePrice: 25, color: '#CD7F32', minPerTeam: 0 }
    ]
  }

  // Adjust base prices based on competitiveness
  const multiplier = competitiveness === 'CASUAL' ? 0.8 :
                    competitiveness === 'HIGHLY_COMPETITIVE' ? 1.2 : 1

  tiers = tiers.map(tier => ({
    ...tier,
    basePrice: Math.round(tier.basePrice * multiplier)
  }))

  // Calculate flexibility percentage
  const totalMinCost = tiers.reduce((sum, tier) =>
    sum + (tier.basePrice * (tier.minPerTeam || 0)), 0
  )
  const flexibility = ((budgetPerTeam - totalMinCost) / budgetPerTeam * 100).toFixed(1)

  const explanation = `
With ${playerCount} players across ${teamCount} teams, each captain drafts ${squadSize} players.
The tier configuration consumes about ${(100 - parseFloat(flexibility)).toFixed(1)}% of the budget on minimums,
leaving ${flexibility}% for strategic bidding. This creates the right balance of ${
    competitiveness === 'CASUAL' ? 'relaxed fun' :
    competitiveness === 'HIGHLY_COMPETITIVE' ? 'intense competition' :
    'moderate strategy'
  } for your auction.
  `.trim()

  return {
    config: {
      budgetPerTeam,
      currencyName: 'Coins',
      currencyIcon: '🪙',
      squadSize,
      numTeams: teamCount
    },
    tiers,
    explanation
  }
}