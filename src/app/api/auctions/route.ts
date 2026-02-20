import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const visibility = searchParams.get('visibility')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (visibility && visibility !== 'all') {
      where.visibility = visibility.toUpperCase()
    }

    // Fetch auctions with counts
    const auctions = await prisma.auction.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        league: {
          select: { id: true, name: true, code: true, logo: true }
        },
        _count: {
          select: {
            teams: true,
            players: true,
            participations: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { scheduledAt: 'asc' }
      ],
      skip,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.auction.count({ where })

    const transformedAuctions = auctions.map(auction => ({
      id: auction.id,
      name: auction.name,
      description: auction.description,
      scheduledAt: auction.scheduledAt,
      timezone: auction.timezone,
      status: auction.status,
      visibility: auction.visibility,
      primaryColor: auction.primaryColor,
      secondaryColor: auction.secondaryColor,
      logo: auction.logo,
      banner: auction.banner,
      tagline: auction.tagline,
      budgetPerTeam: auction.budgetPerTeam,
      currencyName: auction.currencyName,
      currencyIcon: auction.currencyIcon,
      squadSize: auction.squadSize,
      teamCount: auction._count.teams,
      playerCount: auction._count.players,
      participantCount: auction._count.participations,
      owner: auction.owner,
      league: auction.league,
    }))

    return NextResponse.json({
      auctions: transformedAuctions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Failed to fetch auctions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch auctions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
