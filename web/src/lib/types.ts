// Core types for TossUp application
export type AuctionStatus = 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
export type Visibility = 'PUBLIC' | 'PRIVATE'
export type ParticipantRole = 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
export type PlayingRole = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
export type RoundStatus = 'PENDING' | 'OPEN' | 'CLOSED'

// Organization types
export type LeagueType = 'TOURNAMENT' | 'LEAGUE'
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
  userId?: string
}

// Team Types
export interface TeamData {
  name: string
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
  visibility: Visibility
  startDate?: Date
  endDate?: Date
  clubId?: string
}

export interface ClubData {
  name: string
  description?: string
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

// Event Types
export type EventType = 'PRACTICE' | 'MATCH' | 'SOCIAL' | 'OTHER'
export type RsvpStatus = 'GOING' | 'NOT_GOING' | 'MAYBE'

export interface ClubEvent {
  id: string
  clubId: string
  title: string
  description?: string
  eventType: EventType
  location?: string
  startsAt: string
  endsAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface EventRsvp {
  id: string
  eventId: string
  userId: string
  status: RsvpStatus
  respondedAt: string
}

export interface EventWithRsvps extends ClubEvent {
  rsvps: EventRsvp[]
  rsvpCounts: { going: number; maybe: number; notGoing: number }
  currentUserRsvp?: RsvpStatus
}

// Tournament Types
export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'UPCOMING'
export type TeamRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Fixture {
  id: string
  leagueId: string
  matchNumber: number
  teamAName: string
  teamBName: string
  teamAId?: string
  teamBId?: string
  venue?: string
  scheduledAt?: string
  result?: string
  winner?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TournamentRegistration {
  id: string
  leagueId: string
  teamName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  status: TeamRegistrationStatus
  notes?: string
  userId?: string
  createdAt: string
}

export interface TournamentData extends LeagueData {
  registrationUrl?: string
  rulesText?: string
  socialLinks?: Record<string, string>
  format?: string
  venue?: string
  contactInfo?: Record<string, string>
  registrationStatus?: RegistrationStatus
  standings?: Array<Record<string, unknown>>
}

// Notification Types
export type NotificationType =
  | 'EVENT_REMINDER'
  | 'EVENT_CREATED'
  | 'MEMBER_JOINED'
  | 'TOURNAMENT_REGISTRATION'
  | 'TOURNAMENT_UPDATE'
  | 'CLUB_INVITE'
  | 'GENERAL'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  readAt?: string
  createdAt: string
}

// Club enrichment types
export interface ClubSocialLinks {
  instagram?: string
  twitter?: string
  facebook?: string
  website?: string
  whatsapp?: string
}

export interface ClubProfile extends ClubData {
  id: string
  slug: string
  location?: string
  website?: string
  contactEmail?: string
  socialLinks?: ClubSocialLinks
  memberCount?: number
  logo?: string
  banner?: string
  createdAt: string
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
