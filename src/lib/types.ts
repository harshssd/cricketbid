// Core types for TossUp application
export type AuctionStatus = 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
export type Visibility = 'PUBLIC' | 'PRIVATE'
export type ParticipantRole = 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
export type PlayingRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
export type PlayerStatus = 'AVAILABLE' | 'SOLD' | 'UNSOLD'
export type RoundStatus = 'PENDING' | 'OPEN' | 'CLOSED'

// Organization types
export type LeagueType = 'TOURNAMENT' | 'SEASONAL' | 'CHAMPIONSHIP'
export type LeagueStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED'
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
export type AuctionCreationType = 'STANDALONE' | 'LEAGUE'

// Configuration Types
export interface AuctionConfig {
  budgetPerTeam: number
  currencyName: string
  currencyIcon: string
  squadSize: number
  numTeams: number

  // Transparency & Visibility Settings
  tiersVisible?: 'ORGANIZERS_ONLY' | 'CAPTAINS_AND_ORGANIZERS' | 'PUBLIC'
  bidAmountsVisible?: 'HIDDEN' | 'AFTER_BIDDING' | 'REAL_TIME'
  showPlayerStats?: boolean
  allowBidComments?: boolean
  enableNominations?: boolean

  // Bidding Time Management
  biddingTimeLimit?: number // seconds
  enableExtendedTime?: boolean
  extendedTimeSeconds?: number

  // Auto-bid System
  allowAutoBidding?: boolean
  autoBidIncrement?: number
  maxAutoBidRounds?: number

  // Player Sale Policy
  allowUnsoldPlayers?: boolean
  mandatoryBidding?: boolean
  unsoldPlayerAction?: 'REMOVE' | 'BACKLOG' | 'REDUCE_PRICE'
  minimumBidRequired?: boolean
}

export interface TierConfig {
  name: string
  basePrice: number
  color: string
  icon?: string
  minPerTeam: number
  maxPerTeam?: number
}

export interface BrandingConfig {
  logo?: string
  banner?: string
  primaryColor: string
  secondaryColor: string
  bgImage?: string
  font: string
  themePreset?: string
  tagline?: string
}

// Auction Creation Types
export interface CreateAuctionData {
  name: string
  description?: string
  scheduledAt: Date
  timezone: string
  visibility: Visibility
  passcode?: string
  config: AuctionConfig
  branding: BrandingConfig
}

// Player Types
export interface PlayerData {
  name: string
  image?: string
  playingRole: PlayingRole
  battingStyle?: string
  bowlingStyle?: string
  customTags?: string
}

// Team Types
export interface TeamData {
  name: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captainEmail?: string
}

// Bid Types
export interface BidData {
  playerId: string
  amount: number
}

// Dry Run Types
export interface DryRunConfig {
  playerPool: 'FAMOUS_CRICKETERS' | 'CUSTOM'
  aiCaptainStyles: ('AGGRESSIVE' | 'BALANCED' | 'SNIPER' | 'VALUE_HUNTER')[]
  simulationSpeed: 'REAL_TIME' | 'FAST' | 'INSTANT'
}

// Configuration Presets
export interface ConfigPreset {
  name: string
  description: string
  style: string
  budgetPerTeam: number
  tiers: TierConfig[]
  flexiblePercentage: number
  bestFor: string
}

// Famous Cricketers for Dry Run
export interface FamousCricketer {
  name: string
  playingRole: PlayingRole
  battingStyle?: string
  bowlingStyle?: string
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'
  image?: string
}

// Live Auction Types
export interface LiveAuctionState {
  currentRound?: {
    id: string
    tierName: string
    status: RoundStatus
    timeRemaining?: number
  }
  draftBoard: {
    teams: Array<{
      id: string
      name: string
      color: string
      players: Array<{
        id: string
        name: string
        role: PlayingRole
        tierName: string
        tierColor: string
      }>
    }>
  }
}

// Analytics Types
export interface AuctionAnalytics {
  totalSpend: number
  averageBidAmount: number
  mostExpensivePlayer: {
    name: string
    amount: number
  }
  teamBalanceScore: number
  tierDistribution: Record<string, number>
}

// Export Types
export interface ExportOptions {
  format: 'PDF' | 'CSV' | 'IMAGE'
  includesBidAmounts: boolean // Only for owner
  template: 'TEAM_SHEETS' | 'SOCIAL_CARD' | 'RAW_DATA'
}

// Organization Types
export interface LeagueData {
  name: string
  description?: string
  code: string
  type: LeagueType
  status?: LeagueStatus
  logo?: string
  banner?: string
  primaryColor: string
  visibility: Visibility
  season?: string
  startDate?: Date
  endDate?: Date
  maxTeams?: number
  clubId?: string
  settings?: Record<string, any>
}

export interface ClubData {
  name: string
  description?: string
  code: string
  logo?: string
  banner?: string
  primaryColor: string
  visibility: Visibility
  location?: string
  website?: string
  maxMembers?: number
  settings?: Record<string, any>
}

export interface OrganizationMembership {
  id: string
  userId: string
  role: OrganizationRole
  joinedAt: Date
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface OrganizationInvite {
  id: string
  email: string
  role: OrganizationRole
  token: string
  expiresAt: Date
  createdAt: Date
}

// Enhanced Auction Creation
export interface AuctionCreationContext {
  type: AuctionCreationType
  organizationId?: string
  organizationName?: string
  inheritBranding?: boolean
  restrictToMembers?: boolean
}

// User Profile Extension
export interface UserProfile {
  id: string
  name: string
  email: string
  image?: string
  bio?: string
  isEmailVerified: boolean
  createdAt: Date
}

// Dashboard Types
export interface UserDashboardData {
  user: UserProfile
  ownedAuctions: number
  participatedAuctions: number
  ownedLeagues: number
  ownedClubs: number
  leagueMemberships: number
  clubMemberships: number
  pendingInvites: number
  recentActivity: Array<{
    id: string
    type: 'auction_created' | 'auction_joined' | 'organization_joined' | 'invitation_received'
    message: string
    timestamp: Date
  }>
}