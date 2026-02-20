import { Personality, SimTier, SimTierConfig } from './types'

// Tier configuration for the dry run simulation
export const SIM_TIERS: SimTierConfig[] = [
  { tier: 'TIER_0', label: 'Elite',  basePrice: 150, maxPerTeam: 2, count: 6,  sourceTier: 'PLATINUM' },
  { tier: 'TIER_1', label: 'Gold',   basePrice: 100, maxPerTeam: 2, count: 7,  sourceTier: 'GOLD' },
  { tier: 'TIER_2', label: 'Mid',    basePrice: 50,                 count: 16, sourceTier: 'SILVER' },
  { tier: 'TIER_3', label: 'Base',   basePrice: 20,                 count: 16, sourceTier: 'BRONZE' },
]

export const LOWEST_BASE_PRICE = 20

export const NUM_TEAMS = 4
export const BUDGET_PER_TEAM = 1000
export const PICKS_PER_TEAM = 11

// Team names assigned to each personality
export const DEFAULT_TEAM_NAMES: Record<Personality, string> = {
  AGGRESSIVE:   'Chennai Chargers',
  BALANCED:     'Mumbai Mavericks',
  SNIPER:       'Delhi Dynamos',
  VALUE_HUNTER: 'Kolkata Knights',
}

// Bid multiplier ranges per personality per tier: [min, max] applied to basePrice
export const BID_MULTIPLIERS: Record<Personality, Record<SimTier, [number, number]>> = {
  AGGRESSIVE: {
    TIER_0: [1.5, 2.5],
    TIER_1: [1.3, 1.8],
    TIER_2: [1.0, 1.3],
    TIER_3: [1.0, 1.1],
  },
  BALANCED: {
    TIER_0: [1.2, 1.6],
    TIER_1: [1.2, 1.6],
    TIER_2: [1.2, 1.5],
    TIER_3: [1.1, 1.4],
  },
  SNIPER: {
    TIER_0: [1.0, 1.1],
    TIER_1: [1.0, 1.1],
    TIER_2: [1.05, 1.2],
    TIER_3: [1.05, 1.15],
  },
  VALUE_HUNTER: {
    TIER_0: [1.0, 1.2],
    TIER_1: [1.0, 1.3],
    TIER_2: [1.4, 2.0],
    TIER_3: [1.3, 1.8],
  },
}

// SNIPER personality: multiplier range for targeted players
// Kept moderate (1.8-2.5x) so the sniper can still fill the rest of the squad
export const SNIPER_TARGET_MULTIPLIER: Record<SimTier, [number, number]> = {
  TIER_0: [1.8, 2.5],
  TIER_1: [1.8, 2.5],
  TIER_2: [1.0, 1.0],
  TIER_3: [1.0, 1.0],
}

// Number of sniper targets per tier
export const SNIPER_TARGET_COUNTS: Partial<Record<SimTier, number>> = {
  TIER_0: 2,
  TIER_1: 1,
}

// Desperation multiplier range when captain is running low on picks
export const DESPERATION_MULTIPLIER: [number, number] = [1.3, 1.5]

// Threshold: if (playersRemaining - slotsNeeded) < this, trigger desperation
export const DESPERATION_THRESHOLD = 5
