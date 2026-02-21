// Core types for TossUp application
export type AuctionStatus = 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
export type Visibility = 'PUBLIC' | 'PRIVATE'
export type ParticipantRole = 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
export type PlayingRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
export type PlayerStatus = 'AVAILABLE' | 'SOLD' | 'UNSOLD'
export type RoundStatus = 'PENDING' | 'OPEN' | 'CLOSED'

// Organization types
export type LeagueType = 'TOURNAMENT' | 'LEAGUE' | 'SEASONAL' | 'CHAMPIONSHIP'
export type LeagueStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED'
export type OrganizationRole = 'OWNER' | 'MEMBER'

// Configuration Types
export interface AuctionConfig {
  budgetPerTeam: number
  currencyName: string
  currencyIcon: string
  squadSize: number
  numTeams: number
}

export interface TierConfig {
  name: string
  basePrice: number
  color: string
  icon?: string
  minPerTeam: number
  maxPerTeam?: number
}

// Auction Creation Types
export interface CreateAuctionData {
  name: string
  description?: string
  leagueId: string
  visibility: Visibility
  config: AuctionConfig
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

// Organization Types
export interface LeagueData {
  name: string
  description?: string
  type: LeagueType
  status?: LeagueStatus
  logo?: string
  primaryColor: string
  visibility: Visibility
  startDate?: Date
  endDate?: Date
  clubId?: string
}

export interface ClubData {
  name: string
  description?: string
  logo?: string
  primaryColor: string
  visibility: Visibility
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

// User Profile
export interface UserProfile {
  id: string
  name: string
  email: string
  image?: string
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
  recentActivity: Array<{
    id: string
    type: 'auction_created' | 'auction_joined' | 'organization_joined'
    message: string
    timestamp: Date
  }>
}
