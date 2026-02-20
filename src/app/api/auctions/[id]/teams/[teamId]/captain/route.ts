import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const changeCaptainSchema = z.object({
  newCaptainId: z.string()
})

// PUT - Change team captain
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { newCaptainId } = changeCaptainSchema.parse(body)

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
          include: {
            captain: true,
            members: {
              where: { userId: newCaptainId },
              include: { user: true }
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

    // Check permission (auction owner or current team captain)
    const canManage = auction.ownerId === userId || team.captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can change captains' },
        { status: 403 }
      )
    }

    // Verify new captain exists in team members
    if (team.members.length === 0) {
      return NextResponse.json(
        { error: 'New captain must be an existing team member' },
        { status: 400 }
      )
    }

    const newCaptainMember = team.members[0]
    const newCaptainUser = newCaptainMember.user

    // Update team captain
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        captainId: newCaptainId
      },
      include: {
        captain: true
      }
    })

    // Convert the old captain to a team member if they weren't already
    if (team.captain && team.captain.id !== newCaptainId) {
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: team.captain.id
          }
        }
      })

      if (!existingMember) {
        await prisma.teamMember.create({
          data: {
            teamId,
            userId: team.captain.id,
            role: 'VICE_CAPTAIN'
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${newCaptainUser.name} has been promoted to team captain`,
      newCaptain: {
        id: newCaptainUser.id,
        name: newCaptainUser.name,
        email: newCaptainUser.email
      },
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        captainId: updatedTeam.captainId
      }
    })

  } catch (error) {
    console.error('Failed to change team captain:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to change team captain',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}