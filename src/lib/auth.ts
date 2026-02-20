import { createClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user details from our database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    })

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
    const supabase = createClient()

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    // Get user details from our database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    })

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
  auctionId: string,
  passcode?: string
): Promise<AuctionPermissions> {
  try {
    // Get auction details
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        visibility: true,
        passcode: true,
        ownerId: true,
        status: true,
        leagueId: true,
      }
    })

    if (!auction) {
      return { canView: false, canJoin: false, canModerate: false, canManage: false }
    }

    // If auction is public, anyone can view
    if (auction.visibility === 'PUBLIC') {
      const basePermissions = { canView: true, canJoin: true, canModerate: false, canManage: false }

      if (!userId) {
        return basePermissions
      }

      // Check if user is owner
      if (auction.ownerId === userId) {
        return { canView: true, canJoin: true, canModerate: true, canManage: true, role: 'OWNER' }
      }

      // Check if user has existing participation
      const participation = await prisma.auctionParticipation.findFirst({
        where: {
          auctionId: auction.id,
          userId: userId,
        }
      })

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

    // Check if user is owner
    if (auction.ownerId === userId) {
      return { canView: true, canJoin: true, canModerate: true, canManage: true, role: 'OWNER' }
    }

    // Check if user has existing participation
    const participation = await prisma.auctionParticipation.findFirst({
      where: {
        auctionId: auction.id,
        userId: userId,
      }
    })

    if (participation) {
      return {
        canView: true,
        canJoin: true,
        canModerate: ['OWNER', 'MODERATOR'].includes(participation.role),
        canManage: participation.role === 'OWNER',
        role: participation.role
      }
    }

    // Check passcode if provided
    if (passcode && auction.passcode === passcode) {
      return { canView: true, canJoin: true, canModerate: false, canManage: false }
    }

    // Check league membership for league auctions
    if (auction.leagueId) {
      const leagueMembership = await prisma.leagueMembership.findFirst({
        where: {
          leagueId: auction.leagueId,
          userId: userId,
        }
      })

      if (leagueMembership) {
        return {
          canView: true,
          canJoin: ['OWNER', 'MODERATOR', 'MEMBER'].includes(leagueMembership.role),
          canModerate: ['OWNER', 'MODERATOR'].includes(leagueMembership.role),
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

export async function validateAuctionPasscode(auctionId: string, passcode: string): Promise<boolean> {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { passcode: true, visibility: true }
    })

    if (!auction || auction.visibility !== 'PRIVATE') {
      return false
    }

    return auction.passcode === passcode
  } catch (error) {
    console.error('Error validating passcode:', error)
    return false
  }
}

export async function joinAuction(
  userId: string,
  auctionId: string,
  role: 'CAPTAIN' | 'VIEWER' = 'VIEWER',
  teamId?: string
): Promise<boolean> {
  try {
    // Check if user already has participation
    const existingParticipation = await prisma.auctionParticipation.findFirst({
      where: {
        auctionId,
        userId,
      }
    })

    if (existingParticipation) {
      return true // Already joined
    }

    // Create participation
    await prisma.auctionParticipation.create({
      data: {
        auctionId,
        userId,
        role,
        teamId,
        joinedAt: new Date(),
      }
    })

    return true
  } catch (error) {
    console.error('Error joining auction:', error)
    return false
  }
}

// Captain-specific authentication functions

export interface CaptainAuthResult {
  success: boolean
  error?: string
  details?: string
  currentUser?: string
  expectedCaptain?: string
  statusCode?: number
}

/**
 * Verify that a user has team admin access to a specific team
 * Checks multiple sources: team captain, team members with admin roles, and auction participation
 */
export async function verifyTeamAdminAccess(
  userId: string,
  userEmail: string,
  teamId: string,
  auctionId: string
): Promise<CaptainAuthResult> {
  try {
    // Get team with captain info, team members, and auction participation
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: {
          select: { id: true, name: true, email: true }
        },
        auction: {
          select: { id: true, status: true }
        },
        members: {
          where: {
            role: { in: ['CAPTAIN', 'VICE_CAPTAIN'] } // Include captain and vice-captain roles
          },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        participations: {
          where: {
            userId: userId,
            role: { in: ['OWNER', 'MODERATOR', 'CAPTAIN'] } // Admin roles in auction
          }
        }
      }
    })

    if (!team) {
      return {
        success: false,
        error: 'Team not found',
        statusCode: 404
      }
    }

    if (!team.auction || team.auction.id !== auctionId) {
      return {
        success: false,
        error: 'Team does not belong to this auction',
        statusCode: 400
      }
    }

    // Check if user is the assigned team captain
    if (team.captain && team.captain.id === userId) {
      return {
        success: true
      }
    }

    // Check if user is a team member with admin role (CAPTAIN or VICE_CAPTAIN)
    const adminMember = team.members.find(member => member.user.id === userId)
    if (adminMember) {
      return {
        success: true
      }
    }

    // Check if user has admin role in auction participation
    if (team.participations.length > 0) {
      return {
        success: true
      }
    }

    // Collect all authorized users for better error message
    const authorizedUsers = []

    if (team.captain) {
      authorizedUsers.push(`${team.captain.name} (${team.captain.email}) - Team Captain`)
    }

    team.members.forEach(member => {
      authorizedUsers.push(`${member.user.name} (${member.user.email}) - ${member.role.replace('_', ' ')}`)
    })

    return {
      success: false,
      error: 'Access denied - you are not authorized to access this team',
      details: `You are logged in as ${userEmail}. Only the following users can access this team's bidding interface:\n${authorizedUsers.join('\n')}`,
      currentUser: userEmail,
      statusCode: 403
    }
  } catch (error) {
    console.error('Team admin access verification failed:', error)
    return {
      success: false,
      error: 'Internal server error during authorization',
      statusCode: 500
    }
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use verifyTeamAdminAccess instead
 */
export async function verifyCaptainAccess(
  userId: string,
  userEmail: string,
  teamId: string,
  auctionId: string
): Promise<CaptainAuthResult> {
  return verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)
}

/**
 * Get authenticated user info from request headers (set by middleware)
 */
export function getAuthenticatedUser(request: Request): { userId: string | null; userEmail: string | null } {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')

  return {
    userId,
    userEmail
  }
}