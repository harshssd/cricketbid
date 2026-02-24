import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, name, email, image')
      .eq('email', user.email!)
      .maybeSingle()

    if (!dbUser) {
      return null
    }

    return { ...dbUser, image: dbUser.image ?? undefined }
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, name, email, image')
      .eq('email', user.email!)
      .maybeSingle()

    return dbUser ? { ...dbUser, image: dbUser.image ?? undefined } : null
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

export interface AuctionPermissions {
  canView: boolean
  canJoin: boolean
  canModerate: boolean
  canManage: boolean
  role?: 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
}

export async function getUserAuctionPermissions(
  userId: string | null,
  auctionId: string
): Promise<AuctionPermissions> {
  try {
    const supabase = await createClient()

    const { data: auction } = await supabase
      .from('auctions')
      .select('id, visibility, owner_id, status, league_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction) {
      return { canView: false, canJoin: false, canModerate: false, canManage: false }
    }

    // If auction is public, anyone can view
    if (auction.visibility === 'PUBLIC') {
      const basePermissions = { canView: true, canJoin: true, canModerate: false, canManage: false }

      if (!userId) {
        return basePermissions
      }

      if (auction.owner_id === userId) {
        return { canView: true, canJoin: true, canModerate: true, canManage: true, role: 'OWNER' }
      }

      const { data: participation } = await supabase
        .from('auction_participations')
        .select('role')
        .eq('auction_id', auction.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (participation) {
        return {
          canView: true,
          canJoin: true,
          canModerate: ['OWNER', 'MODERATOR'].includes(participation.role),
          canManage: participation.role === 'OWNER',
          role: participation.role
        }
      }

      return basePermissions
    }

    // Private auction logic
    if (!userId) {
      return { canView: false, canJoin: false, canModerate: false, canManage: false }
    }

    if (auction.owner_id === userId) {
      return { canView: true, canJoin: true, canModerate: true, canManage: true, role: 'OWNER' }
    }

    const { data: participation } = await supabase
      .from('auction_participations')
      .select('role')
      .eq('auction_id', auction.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (participation) {
      return {
        canView: true,
        canJoin: true,
        canModerate: ['OWNER', 'MODERATOR'].includes(participation.role),
        canManage: participation.role === 'OWNER',
        role: participation.role
      }
    }

    // Check league membership for league auctions
    if (auction.league_id) {
      const { data: leagueMembership } = await supabase
        .from('league_memberships')
        .select('role')
        .eq('league_id', auction.league_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (leagueMembership) {
        return {
          canView: true,
          canJoin: true,
          canModerate: leagueMembership.role === 'OWNER',
          canManage: leagueMembership.role === 'OWNER',
        }
      }
    }

    return { canView: false, canJoin: false, canModerate: false, canManage: false }
  } catch (error) {
    console.error('Error checking auction permissions:', error)
    return { canView: false, canJoin: false, canModerate: false, canManage: false }
  }
}

export async function joinAuction(
  userId: string,
  auctionId: string,
  role: 'CAPTAIN' | 'VIEWER' = 'VIEWER',
  teamId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data: existingParticipation } = await supabase
      .from('auction_participations')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingParticipation) {
      return true
    }

    const { error } = await supabase
      .from('auction_participations')
      .insert({
        auction_id: auctionId,
        user_id: userId,
        role,
        team_id: teamId || null,
      })

    return !error
  } catch (error) {
    console.error('Error joining auction:', error)
    return false
  }
}

// Captain-specific authentication

export interface CaptainAuthResult {
  success: boolean
  accessRole?: 'CAPTAIN' | 'VICE_CAPTAIN' | 'AUCTION_ADMIN' | 'AUCTION_OWNER'
  error?: string
  details?: string
  currentUser?: string
  expectedCaptain?: string
  statusCode?: number
}

export async function verifyTeamAdminAccess(
  userId: string,
  userEmail: string,
  teamId: string,
  auctionId: string
): Promise<CaptainAuthResult> {
  try {
    const supabase = await createClient()

    // Get team with captain and auction info
    const { data: team } = await supabase
      .from('teams')
      .select(`
        id, name, captain_user_id, auction_id,
        captain:users!captain_user_id(id, name, email),
        auction:auctions!auction_id(id, status)
      `)
      .eq('id', teamId)
      .maybeSingle()

    if (!team) {
      return { success: false, error: 'Team not found', statusCode: 404 }
    }

    const teamAuction = team.auction as unknown as { id: string; status: string } | null
    const teamCaptain = team.captain as unknown as { id: string; name: string; email: string } | null

    if (!teamAuction || teamAuction.id !== auctionId) {
      return { success: false, error: 'Team does not belong to this auction', statusCode: 400 }
    }

    // Check if user is the assigned team captain
    if (teamCaptain && teamCaptain.id === userId) {
      return { success: true, accessRole: 'CAPTAIN' }
    }

    // Check if user has admin role in auction participation for this team
    const { data: teamParticipations } = await supabase
      .from('auction_participations')
      .select('id, role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .in('role', ['OWNER', 'MODERATOR', 'CAPTAIN'])

    if (teamParticipations && teamParticipations.length > 0) {
      const role = teamParticipations[0].role
      return {
        success: true,
        accessRole: role === 'CAPTAIN' ? 'CAPTAIN' : 'AUCTION_ADMIN',
      }
    }

    // Check if user is an auction-level OWNER or MODERATOR (can access any team)
    const { data: auctionAdminParticipations } = await supabase
      .from('auction_participations')
      .select('id, role')
      .eq('auction_id', auctionId)
      .eq('user_id', userId)
      .in('role', ['OWNER', 'MODERATOR'])

    if (auctionAdminParticipations && auctionAdminParticipations.length > 0) {
      return { success: true, accessRole: 'AUCTION_ADMIN' }
    }

    // Check if user is the auction owner directly
    const { data: auctionData } = await supabase
      .from('auctions')
      .select('owner_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionData?.owner_id === userId) {
      return { success: true, accessRole: 'AUCTION_OWNER' }
    }

    const authorizedUsers: string[] = []
    if (teamCaptain) {
      authorizedUsers.push(`${teamCaptain.name} (${teamCaptain.email}) - Team Captain`)
    }
    return {
      success: false,
      error: 'Access denied - you are not authorized to access this team',
      details: `You are logged in as ${userEmail}. Only the following users can access this team's bidding interface:\n${authorizedUsers.join('\n')}`,
      currentUser: userEmail,
      statusCode: 403
    }
  } catch (error) {
    console.error('Team admin access verification failed:', error)
    return { success: false, error: 'Internal server error during authorization', statusCode: 500 }
  }
}

export function getAuthenticatedUser(request: Request): { userId: string | null; userEmail: string | null } {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')
  return { userId, userEmail }
}
