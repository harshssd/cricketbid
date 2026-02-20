import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transferTeamSchema = z.object({
  teamId: z.string(),
  targetType: z.enum(['CLUB', 'LEAGUE', 'AUCTION']),
  targetId: z.string(), // Club ID, League ID, or Auction ID
  preserveMembers: z.boolean().default(false),
  newCaptainId: z.string().optional(),
})

// Transfer team between contexts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, targetType, targetId, preserveMembers, newCaptainId } = transferTeamSchema.parse(body)

    // Get the source team
    const sourceTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true }
        },
        captain: true
      }
    })

    if (!sourceTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Validate target exists
    switch (targetType) {
      case 'CLUB':
        const targetClub = await prisma.club.findUnique({ where: { id: targetId } })
        if (!targetClub) {
          return NextResponse.json(
            { error: 'Target club not found' },
            { status: 404 }
          )
        }
        break
      case 'LEAGUE':
        const targetLeague = await prisma.league.findUnique({
          where: { id: targetId },
          include: { _count: { select: { teams: true } } }
        })
        if (!targetLeague) {
          return NextResponse.json(
            { error: 'Target league not found' },
            { status: 404 }
          )
        }
        // Check team limit
        if (targetLeague.maxTeams && targetLeague._count.teams >= targetLeague.maxTeams) {
          return NextResponse.json(
            { error: `League is full. Maximum ${targetLeague.maxTeams} teams allowed.` },
            { status: 400 }
          )
        }
        break
      case 'AUCTION':
        const targetAuction = await prisma.auction.findUnique({ where: { id: targetId } })
        if (!targetAuction) {
          return NextResponse.json(
            { error: 'Target auction not found' },
            { status: 404 }
          )
        }
        break
    }

    // Perform transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update team association
      const updateData: any = {
        clubId: null,
        leagueId: null,
        auctionId: null,
      }

      // Set the new association
      switch (targetType) {
        case 'CLUB':
          updateData.clubId = targetId
          updateData.budgetRemaining = null // Clear auction-specific fields
          break
        case 'LEAGUE':
          updateData.leagueId = targetId
          updateData.budgetRemaining = null // Clear auction-specific fields
          break
        case 'AUCTION':
          updateData.auctionId = targetId
          // Keep existing budget or set default if not set
          if (!sourceTeam.budgetRemaining) {
            updateData.budgetRemaining = 1000 // Default auction budget
          }
          break
      }

      // Update captain if provided
      if (newCaptainId) {
        updateData.captainId = newCaptainId
      }

      // Transfer the team
      const transferredTeam = await tx.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          captain: { select: { id: true, name: true, email: true, image: true } },
          club: { select: { id: true, name: true, logo: true } },
          league: { select: { id: true, name: true, logo: true } },
          auction: { select: { id: true, name: true } },
          _count: { select: { members: true } }
        }
      })

      // Update member roles if captain changed
      if (newCaptainId && sourceTeam.members.length > 0) {
        // Reset all members to PLAYER role
        await tx.teamMember.updateMany({
          where: { teamId },
          data: { role: 'PLAYER' }
        })

        // Set new captain role
        await tx.teamMember.updateMany({
          where: {
            teamId,
            userId: newCaptainId
          },
          data: { role: 'CAPTAIN' }
        })
      }

      return {
        sourceTeam,
        transferredTeam,
        membersTransferred: preserveMembers ? sourceTeam.members?.length || 0 : 0
      }
    })

    const fromType = sourceTeam.clubId ? 'CLUB' :
                    sourceTeam.leagueId ? 'LEAGUE' :
                    sourceTeam.auctionId ? 'AUCTION' : 'UNKNOWN'

    return NextResponse.json({
      success: true,
      message: `Successfully transferred team from ${fromType.toLowerCase()} to ${targetType.toLowerCase()}`,
      transfer: result,
    })

  } catch (error) {
    console.error('Failed to transfer team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to transfer team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get available transfer options for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Get team to determine current context
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
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

    // Get available targets
    const availableTargets: { clubs?: any[], leagues?: any[], auctions?: any[] } = {}

    // Always allow transfer to clubs and leagues
    availableTargets.clubs = await prisma.club.findMany({
      where: { id: { not: team.clubId || undefined } },
      select: { id: true, name: true, logo: true, _count: { select: { teams: true } } }
    })

    availableTargets.leagues = await prisma.league.findMany({
      where: { id: { not: team.leagueId || undefined } },
      select: { id: true, name: true, logo: true, _count: { select: { teams: true } }, maxTeams: true }
    })

    // Allow transfer to auctions if not already in an auction
    if (!team.auctionId) {
      availableTargets.auctions = await prisma.auction.findMany({
        where: { status: { in: ['DRAFT', 'LIVE'] } }, // Only active auctions
        select: { id: true, name: true, _count: { select: { teams: true } } }
      })
    }

    const currentContext = team.clubId ? 'CLUB' :
                          team.leagueId ? 'LEAGUE' :
                          team.auctionId ? 'AUCTION' : null

    return NextResponse.json({
      success: true,
      currentContext,
      team: {
        id: team.id,
        name: team.name,
        currentAssociation: team.club || team.league || team.auction
      },
      availableTargets,
      validTransfers: {
        toClub: true,
        toLeague: true,
        toAuction: !team.auctionId // Can only move to auction if not already in one
      }
    })

  } catch (error) {
    console.error('Failed to get transfer options:', error)
    return NextResponse.json(
      { error: 'Failed to get transfer options' },
      { status: 500 }
    )
  }
}