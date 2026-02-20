import { PlayingRole, FamousCricketer } from '../types'

export type Personality = 'AGGRESSIVE' | 'BALANCED' | 'SNIPER' | 'VALUE_HUNTER'

export type SimTier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3'

export interface SimTierConfig {
  tier: SimTier
  label: string
  basePrice: number
  maxPerTeam?: number
  count: number
  sourceTier: FamousCricketer['tier']
}

export interface SimPlayer {
  name: string
  playingRole: PlayingRole
  battingStyle?: string
  bowlingStyle?: string
  tier: SimTier
  basePrice: number
}

export interface TeamState {
  id: number
  name: string
  personality: Personality
  budget: number
  squad: PickedPlayer[]
  tierCounts: Record<SimTier, number>
  sniperTargets?: string[] // player names for SNIPER personality
}

export interface PickedPlayer {
  player: SimPlayer
  paidPrice: number
}

export interface SealedBid {
  teamId: number
  amount: number
}

export interface BidResolution {
  player: SimPlayer
  winningTeamId: number | null // null if unsold
  winningBid: number
  allBids: SealedBid[]
}

export interface TeamResult {
  id: number
  name: string
  personality: Personality
  totalSpent: number
  remainingBudget: number
  squad: PickedPlayer[]
  tierCounts: Record<SimTier, number>
  roleCounts: Record<PlayingRole, number>
}

export interface BalanceMetrics {
  playerCountVariance: number
  topTierDistribution: number
  spendVariance: number
  roleBalance: number
}

export interface BalanceReport {
  overallScore: number
  metrics: BalanceMetrics
  tier0Distribution: number[]
  tier1Distribution: number[]
  spending: number[]
  recommendations: string[]
}

export interface AuctionLog {
  round: number
  player: SimPlayer
  bids: SealedBid[]
  winnerId: number | null
  winningBid: number
}

export interface SimulationResult {
  seed: number
  teams: TeamResult[]
  auctionLog: AuctionLog[]
  unsoldPlayers: SimPlayer[]
  balanceReport: BalanceReport
}

export interface SimulationInput {
  seed: number
  numTeams: number
  budgetPerTeam: number
  picksPerTeam: number
  tiers: SimTierConfig[]
}
