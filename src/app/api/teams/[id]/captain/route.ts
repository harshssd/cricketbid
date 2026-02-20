import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignCaptainSchema = z.object({
  captainId: z.string().optional(),
})

// Assign or update team captain
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const body = await request.json()
    const { captainId } = assignCaptainSchema.parse(body)

    // Get the team to determine its context
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Validate captain exists and is eligible
    if (captainId) {
      const captain = await prisma.user.findUnique({
        where: { id: captainId }
      })

      if (!captain) {
        return NextResponse.json(
          { error: 'Captain not found' },
          { status: 404 }
        )
      }

      // Check if captain is a member of the team
      const isMember = team.members.some(member => member.userId === captainId)

      // For auction teams, also check auction participation
      if (!isMember && team.auctionId) {
        const participation = await prisma.auctionParticipation.findFirst({
          where: {
            auctionId: team.auctionId,
            userId: captainId
          }
        })
        if (!participation) {
          return NextResponse.json(
            { error: 'Captain must be a member of the team or auction participant' },
            { status: 400 }
          )
        }
      } else if (!isMember) {
        return NextResponse.json(
          { error: 'Captain must be a member of the team' },
          { status: 400 }
        )
      }
    }

    // Update team captain in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update team captain
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: { captainId },
        include: {
          captain: { select: { id: true, name: true, email: true, image: true } },
          club: { select: { id: true, name: true } },
          league: { select: { id: true, name: true } },
          auction: { select: { id: true, name: true } },
          _count: { select: { members: true } }
        }
      })

      // Update member roles
      if (team.members.length > 0) {
        // Reset all members to PLAYER role
        await tx.teamMember.updateMany({
          where: { teamId },
          data: { role: 'PLAYER' }
        })

        // Set new captain role if captain is assigned
        if (captainId) {
          await tx.teamMember.updateMany({
            where: {
              teamId,
              userId: captainId
            },
            data: { role: 'CAPTAIN' }
          })
        }
      }

      return updatedTeam
    })

    return NextResponse.json({
      success: true,
      team: result,
      message: captainId ? 'Captain assigned successfully' : 'Captain removed successfully'
    })

  } catch (error) {
    console.error('Failed to assign captain:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to assign captain',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get captain assignment options
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params

    // Get team with its members
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        },
        club: { select: { id: true, name: true } },
        league: { select: { id: true, name: true } },
        auction: { select: { id: true, name: true } }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get eligible members
    let eligibleMembers = team.members.map(member => ({
      ...member.user,
      currentRole: member.role
    }))

    // For auction teams, also include auction participants
    if (team.auctionId && team.members.length === 0) {
      const auctionParticipants = await prisma.auctionParticipation.findMany({
        where: { auctionId: team.auctionId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } }
        }
      })

      eligibleMembers = auctionParticipants.map(participation => ({
        ...participation.user,
        currentRole: participation.userId === team.captainId ? 'CAPTAIN' as const : 'PLAYER' as const
      }))
    }

    const teamType = team.clubId ? 'CLUB' :
                    team.leagueId ? 'LEAGUE' :
                    team.auctionId ? 'AUCTION' : 'UNKNOWN'

    return NextResponse.json({
      success: true,
      eligibleMembers,
      currentCaptain: team.captain,
      teamInfo: {
        id: team.id,
        name: team.name,
        type: teamType,
        context: team.club || team.league || team.auction
      }
    })

  } catch (error) {
    console.error('Failed to get captain options:', error)
    return NextResponse.json(
      { error: 'Failed to get captain options' },
      { status: 500 }
    )
  }
}