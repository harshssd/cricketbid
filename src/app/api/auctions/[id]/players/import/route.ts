import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const playerSchema = z.object({
  name: z.string().min(1, 'Player name is required'),
  image: z.string().url().optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  customTags: z.string().optional(),
  tierId: z.string().min(1, 'Tier is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userId: z.string().optional(),
})

const importPlayersSchema = z.object({
  players: z.array(playerSchema).min(1, 'At least one player is required'),
  overwrite: z.boolean().default(false),
  autoLinkUsers: z.boolean().default(true),
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()
    const validatedData = importPlayersSchema.parse(body)

    // Check if auction exists and is in DRAFT status
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        tiers: {
          select: { id: true, name: true }
        }
      }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Players can only be imported in DRAFT status' },
        { status: 400 }
      )
    }

    // Validate all tier IDs exist
    const tierIds = new Set(auction.tiers.map(t => t.id))
    const invalidTierIds = validatedData.players
      .map(p => p.tierId)
      .filter(tierId => !tierIds.has(tierId))

    if (invalidTierIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid tier IDs found',
          details: { invalidTierIds: Array.from(new Set(invalidTierIds)) }
        },
        { status: 400 }
      )
    }

    // If overwrite is true, delete existing players
    if (validatedData.overwrite) {
      await prisma.player.deleteMany({
        where: { auctionId: auctionId }
      })
    }

    // Create players in batches with user linking
    const createdPlayers = await prisma.$transaction(async (tx) => {
      const players = []
      const linkingResults = {
        linked: 0,
        unlinked: 0,
        errors: [] as string[]
      }

      for (const playerData of validatedData.players) {
        let linkingInfo = {
          userId: null as string | null,
          isLinked: false,
          linkedAt: null as Date | null,
          linkingMethod: null as any,
          linkVerified: false
        }

        if (playerData.userId) {
          const user = await tx.user.findUnique({
            where: { id: playerData.userId },
            select: { id: true, email: true }
          })

          if (user) {
            linkingInfo = {
              userId: playerData.userId,
              isLinked: true,
              linkedAt: new Date(),
              linkingMethod: 'MANUAL_LINK',
              linkVerified: true
            }
            linkingResults.linked++
          } else {
            linkingResults.errors.push(`User not found for ID: ${playerData.userId} (player: ${playerData.name})`)
          }
        } else if (validatedData.autoLinkUsers && playerData.email) {
          const user = await tx.user.findUnique({
            where: { email: playerData.email },
            select: { id: true, email: true }
          })

          if (user) {
            linkingInfo = {
              userId: user.id,
              isLinked: true,
              linkedAt: new Date(),
              linkingMethod: 'EMAIL_MATCH',
              linkVerified: true
            }
            linkingResults.linked++
          } else {
            linkingResults.unlinked++
          }
        } else {
          linkingResults.unlinked++
        }

        const player = await tx.player.create({
          data: {
            ...playerData,
            auctionId: auctionId,
            status: 'AVAILABLE',
            ...linkingInfo
          },
          include: {
            tier: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                color: true,
              }
            },
            linkedUser: linkingInfo.isLinked ? {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            } : false
          }
        })
        players.push(player)
      }
      return { players, linkingResults }
    })

    const playerCount = await prisma.player.count({
      where: { auctionId: auctionId }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${createdPlayers.players.length} players`,
      players: createdPlayers.players,
      totalPlayers: playerCount,
      overwritten: validatedData.overwrite,
      linking: {
        enabled: validatedData.autoLinkUsers,
        results: createdPlayers.linkingResults,
        summary: `${createdPlayers.linkingResults.linked} linked, ${createdPlayers.linkingResults.unlinked} unlinked${createdPlayers.linkingResults.errors.length > 0 ? `, ${createdPlayers.linkingResults.errors.length} errors` : ''}`
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid player data',
          details: error.issues
        },
        { status: 400 }
      )
    }

    console.error('Failed to import players:', error)
    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    )
  }
}

// Get current players for preview/validation
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const players = await prisma.player.findMany({
      where: { auctionId: auctionId },
      include: {
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true,
          }
        },
        assignedTeam: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
          }
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      },
      orderBy: [
        { isLinked: 'desc' },
        { status: 'asc' },
        { name: 'asc' }
      ]
    })

    const playerStats = {
      total: players.length,
      available: players.filter(p => p.status === 'AVAILABLE').length,
      sold: players.filter(p => p.status === 'SOLD').length,
      unsold: players.filter(p => p.status === 'UNSOLD').length,
      linked: players.filter(p => p.isLinked).length,
      unlinked: players.filter(p => !p.isLinked).length,
      verified: players.filter(p => p.linkVerified).length,
    }

    return NextResponse.json({
      players,
      playerStats
    })

  } catch (error) {
    console.error('Failed to fetch players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
