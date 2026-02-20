import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const addAdminSchema = z.object({
  userEmail: z.string().email(),
  role: z.enum(['CAPTAIN', 'VICE_CAPTAIN']).default('VICE_CAPTAIN')
})

const removeAdminSchema = z.object({
  userId: z.string()
})

// GET - List team admins
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params

    // Get authenticated user
    const { userId, userEmail } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has permission to manage this team (auction owner or team captain)
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          where: { id: teamId },
          include: {
            captain: true,
            members: {
              where: { role: { in: ['CAPTAIN', 'VICE_CAPTAIN'] } },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true }
                }
              }
            }
          }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const team = auction.teams[0]
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (auction owner or team captain)
    const canManage = auction.ownerId === userId || team.captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can manage admins' },
        { status: 403 }
      )
    }

    // Build admin list
    const admins = []

    // Add team captain if exists
    if (team.captain) {
      admins.push({
        id: team.captain.id,
        name: team.captain.name,
        email: team.captain.email,
        image: team.captain.image,
        role: 'CAPTAIN',
        source: 'team_captain'
      })
    }

    // Add team members with admin roles
    team.members.forEach(member => {
      if (member.user.id !== team.captain?.id) { // Don't duplicate captain
        admins.push({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          role: member.role,
          source: 'team_member'
        })
      }
    })

    return NextResponse.json({
      teamId,
      teamName: team.name,
      admins,
      canManage
    })

  } catch (error) {
    console.error('Failed to fetch team admins:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch team admins',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Add team admin
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { userEmail, role } = addAdminSchema.parse(body)

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user has permission to manage this team
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          where: { id: teamId },
          include: { captain: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const team = auction.teams[0]
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check permission
    const canManage = auction.ownerId === userId || team.captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can add admins' },
        { status: 403 }
      )
    }

    // Find user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true }
    })

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'User not found with this email address' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: userToAdd.id
        }
      }
    })

    if (existingMember) {
      // Update existing member's role
      await prisma.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: userToAdd.id
          }
        },
        data: { role }
      })
    } else {
      // Create new team member
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: userToAdd.id,
          role
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `${userToAdd.name} has been added as ${role.replace('_', ' ').toLowerCase()}`,
      user: userToAdd,
      role
    })

  } catch (error) {
    console.error('Failed to add team admin:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to add team admin',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove team admin
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { userId: userIdToRemove } = removeAdminSchema.parse(body)

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify permission
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          where: { id: teamId },
          include: { captain: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const team = auction.teams[0]
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check permission
    const canManage = auction.ownerId === userId || team.captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can remove admins' },
        { status: 403 }
      )
    }

    // Cannot remove the main team captain
    if (team.captain?.id === userIdToRemove) {
      return NextResponse.json(
        { error: 'Cannot remove the main team captain. Change the captain first.' },
        { status: 400 }
      )
    }

    // Remove team member
    const deletedMember = await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: userIdToRemove
        }
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `${deletedMember.user.name} has been removed from team admins`,
      removedUser: deletedMember.user
    })

  } catch (error) {
    console.error('Failed to remove team admin:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to remove team admin',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}