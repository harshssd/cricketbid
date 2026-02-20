import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        league: {
          select: { id: true, name: true, code: true, type: true, logo: true, primaryColor: true }
        },
        teams: {
          include: {
            captain: {
              select: { id: true, name: true, email: true, image: true }
            },
            players: {
              select: { id: true, name: true, playingRole: true, status: true }
            },
            _count: {
              select: { players: true, members: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        tiers: {
          include: {
            _count: { select: { players: true } }
          },
          orderBy: { sortOrder: 'asc' }
        },
        players: {
          include: {
            tier: {
              select: { id: true, name: true, basePrice: true, color: true }
            },
            assignedTeam: {
              select: { id: true, name: true, primaryColor: true }
            }
          },
          orderBy: [{ status: 'asc' }, { name: 'asc' }]
        },
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            },
            team: {
              select: { id: true, name: true, primaryColor: true }
            }
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
        },
        rounds: {
          include: {
            tier: true,
            _count: { select: { bids: true } }
          },
          orderBy: { id: 'desc' }
        },
        _count: {
          select: { teams: true, players: true, participations: true, rounds: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const playerStats = {
      total: auction.players.length,
      available: auction.players.filter(p => p.status === 'AVAILABLE').length,
      sold: auction.players.filter(p => p.status === 'SOLD').length,
      unsold: auction.players.filter(p => p.status === 'UNSOLD').length,
    }

    const teamStats = auction.teams.map(team => ({
      id: team.id,
      name: team.name,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      logo: team.logo,
      captain: team.captain,
      budgetRemaining: team.budgetRemaining ?? auction.budgetPerTeam,
      budgetSpent: auction.budgetPerTeam - (team.budgetRemaining ?? auction.budgetPerTeam),
      playerCount: team._count.players,
      players: team.players,
    }))

    const tierStats = auction.tiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      basePrice: tier.basePrice,
      color: tier.color,
      icon: tier.icon,
      sortOrder: tier.sortOrder,
      minPerTeam: tier.minPerTeam,
      maxPerTeam: tier.maxPerTeam,
      playerCount: tier._count.players,
    }))

    const participationStats = {
      total: auction.participations.length,
      owners: auction.participations.filter(p => p.role === 'OWNER').length,
      moderators: auction.participations.filter(p => p.role === 'MODERATOR').length,
      captains: auction.participations.filter(p => p.role === 'CAPTAIN').length,
      viewers: auction.participations.filter(p => p.role === 'VIEWER').length,
    }

    return NextResponse.json({
      id: auction.id,
      name: auction.name,
      description: auction.description,
      ownerId: auction.ownerId,
      scheduledAt: auction.scheduledAt,
      timezone: auction.timezone,
      status: auction.status,
      visibility: auction.visibility,
      passcode: auction.passcode,
      budgetPerTeam: auction.budgetPerTeam,
      currencyName: auction.currencyName,
      currencyIcon: auction.currencyIcon,
      squadSize: auction.squadSize,
      logo: auction.logo,
      banner: auction.banner,
      primaryColor: auction.primaryColor,
      secondaryColor: auction.secondaryColor,
      bgImage: auction.bgImage,
      font: auction.font,
      themePreset: auction.themePreset,
      tagline: auction.tagline,
      leagueId: auction.leagueId,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
      owner: auction.owner,
      league: auction.league,
      teams: teamStats,
      tiers: tierStats,
      players: auction.players,
      participations: auction.participations,
      rounds: auction.rounds,
      playerStats,
      participationStats,
      _count: auction._count,
    })

  } catch (error) {
    console.error('Failed to fetch auction details:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch auction details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Update auction (for settings, status changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const updates = await request.json()

    // Use transaction to update auction and teams if budget is changed
    const updatedAuction = await prisma.$transaction(async (tx) => {
      // Update the auction
      const auction = await tx.auction.update({
        where: { id: auctionId },
        data: updates,
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true }
          },
          teams: {
            include: {
              captain: {
                select: { id: true, name: true, email: true, image: true }
              },
              _count: { select: { players: true } }
            }
          },
          _count: {
            select: { teams: true, players: true, participations: true }
          }
        }
      })

      // If budgetPerTeam was updated, also update all team budgetRemaining
      if (updates.budgetPerTeam !== undefined) {
        await tx.team.updateMany({
          where: { auctionId },
          data: { budgetRemaining: updates.budgetPerTeam }
        })
      }

      return auction
    })

    return NextResponse.json(updatedAuction)

  } catch (error) {
    console.error('Failed to update auction:', error)
    return NextResponse.json(
      {
        error: 'Failed to update auction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Delete auction
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
        _count: {
          select: { teams: true, players: true, participations: true, rounds: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status === 'LIVE') {
      return NextResponse.json(
        { error: 'Cannot delete a live auction. Please end the auction first.' },
        { status: 400 }
      )
    }

    await prisma.auction.delete({
      where: { id: auctionId }
    })

    return NextResponse.json({
      success: true,
      message: `Auction "${auction.name}" has been deleted successfully`,
      deletedAuction: {
        id: auction.id,
        name: auction.name,
        deletedCounts: auction._count
      }
    })

  } catch (error) {
    console.error('Failed to delete auction:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete auction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
