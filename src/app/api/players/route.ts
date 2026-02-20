import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Schema for searching players
const searchPlayersSchema = z.object({
  searchQuery: z.string().optional(),
  auctionId: z.string().optional(),
  isLinked: z.boolean().optional(),
  linkingMethod: z.enum(['EMAIL_MATCH', 'MANUAL_LINK', 'USER_CLAIM', 'INVITATION']).optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']).optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'UNSOLD']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'linkedAt', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Schema for creating a player (not auction-specific)
const createPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  image: z.string().url().optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  customTags: z.string().optional(),
  userId: z.string().optional(), // Link to user during creation
})

// Get players with search and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const {
      searchQuery,
      auctionId,
      isLinked,
      linkingMethod,
      playingRole,
      status,
      page,
      limit,
      sortBy,
      sortOrder
    } = searchPlayersSchema.parse({
      searchQuery: searchParams.get('searchQuery'),
      auctionId: searchParams.get('auctionId'),
      isLinked: searchParams.get('isLinked') === 'true' ? true : searchParams.get('isLinked') === 'false' ? false : undefined,
      linkingMethod: searchParams.get('linkingMethod'),
      playingRole: searchParams.get('playingRole'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    // Build where clause
    let whereClause: any = {}

    if (auctionId) {
      whereClause.auctionId = auctionId
    }

    if (typeof isLinked === 'boolean') {
      whereClause.isLinked = isLinked
    }

    if (linkingMethod) {
      whereClause.linkingMethod = linkingMethod
    }

    if (playingRole) {
      whereClause.playingRole = playingRole
    }

    if (status) {
      whereClause.status = status
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { customTags: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Build order by
    let orderBy: any = {}
    if (sortBy === 'linkedAt') {
      orderBy.linkedAt = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else {
      orderBy.name = sortOrder
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get players and total count
    const [players, totalCount] = await Promise.all([
      prisma.player.findMany({
        where: whereClause,
        include: {
          linkedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          auction: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          tier: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              color: true
            }
          },
          assignedTeam: {
            select: {
              id: true,
              name: true,
              primaryColor: true
            }
          }
        },
        orderBy: orderBy,
        skip: skip,
        take: limit
      }),
      prisma.player.count({ where: whereClause })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      players,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        searchQuery,
        auctionId,
        isLinked,
        linkingMethod,
        playingRole,
        status
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to search players:', error)
    return NextResponse.json({
      error: 'Failed to search players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create a player (for global player registry - future enhancement)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const playerData = createPlayerSchema.parse(body)

    // Check if a user with the same email already exists (if email provided)
    if (playerData.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: playerData.email }
      })

      // If email matches an existing user, suggest linking
      if (existingUserWithEmail && !playerData.userId) {
        return NextResponse.json({
          error: 'Email matches existing user',
          suggestion: 'Consider linking this player to the existing user',
          existingUser: {
            id: existingUserWithEmail.id,
            name: existingUserWithEmail.name,
            email: existingUserWithEmail.email
          }
        }, { status: 409 })
      }
    }

    // For now, we'll return a message that global player creation is not implemented
    // This would be implemented when we add a global player registry
    return NextResponse.json({
      error: 'Global player creation not yet implemented',
      message: 'Players are currently created within auction contexts only. Use the auction player import API instead.',
      suggestion: 'Use /api/auctions/{auctionId}/players/import to add players to specific auctions'
    }, { status: 501 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to create player:', error)
    return NextResponse.json({
      error: 'Failed to create player',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}