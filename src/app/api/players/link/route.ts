import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Schema for linking a player to a user
const linkPlayerSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  linkingMethod: z.enum(['EMAIL_MATCH', 'MANUAL_LINK', 'USER_CLAIM', 'INVITATION']),
  verifyLink: z.boolean().default(false), // Whether to mark the link as verified
})

// Schema for unlinking a player from a user
const unlinkPlayerSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
})

// Schema for getting linking suggestions
const getLinkSuggestionsSchema = z.object({
  auctionId: z.string().optional(),
  userId: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
})

// Link a player to a user account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, userId, linkingMethod, verifyLink } = linkPlayerSchema.parse(body)

    // Check if player exists and is not already linked to a different user
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
      include: { linkedUser: true }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (existingPlayer.isLinked && existingPlayer.userId !== userId) {
      return NextResponse.json(
        { error: 'Player is already linked to another user' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Link the player to the user
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        userId: userId,
        isLinked: true,
        linkedAt: new Date(),
        linkingMethod: linkingMethod,
        linkVerified: verifyLink,
      },
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
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Player linked successfully',
      player: updatedPlayer
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to link player:', error)
    return NextResponse.json({
      error: 'Failed to link player',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Unlink a player from a user account
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId } = unlinkPlayerSchema.parse(body)

    // Check if player exists and is linked
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    })

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    if (!existingPlayer.isLinked) {
      return NextResponse.json(
        { error: 'Player is not linked to any user' },
        { status: 400 }
      )
    }

    // Unlink the player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        userId: null,
        isLinked: false,
        linkedAt: null,
        linkingMethod: null,
        linkVerified: false,
      },
      include: {
        auction: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Player unlinked successfully',
      player: updatedPlayer
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to unlink player:', error)
    return NextResponse.json({
      error: 'Failed to unlink player',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get linking suggestions and player status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { auctionId, userId, searchQuery, limit } = getLinkSuggestionsSchema.parse({
      auctionId: searchParams.get('auctionId'),
      userId: searchParams.get('userId'),
      searchQuery: searchParams.get('searchQuery'),
      limit: searchParams.get('limit'),
    })

    let whereClause: any = {}

    // Filter by auction if provided
    if (auctionId) {
      whereClause.auctionId = auctionId
    }

    // Search query for player names or emails
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    const players = await prisma.player.findMany({
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
            name: true
          }
        },
        tier: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            color: true
          }
        }
      },
      orderBy: [
        { isLinked: 'asc' }, // Show unlinked players first
        { name: 'asc' }
      ],
      take: limit
    })

    // If userId provided, also find potential matches by email
    let suggestions: any[] = []
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })

      if (user) {
        // Find players with matching email
        const emailMatches = await prisma.player.findMany({
          where: {
            email: user.email,
            isLinked: false,
            ...(auctionId && { auctionId })
          },
          include: {
            auction: {
              select: {
                id: true,
                name: true
              }
            },
            tier: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                color: true
              }
            }
          }
        })

        // Find players with similar names
        const nameMatches = await prisma.player.findMany({
          where: {
            name: { contains: user.name, mode: 'insensitive' },
            isLinked: false,
            ...(auctionId && { auctionId })
          },
          include: {
            auction: {
              select: {
                id: true,
                name: true
              }
            },
            tier: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                color: true
              }
            }
          }
        })

        suggestions = [
          ...emailMatches.map(p => ({ ...p, matchType: 'email', confidence: 0.9 })),
          ...nameMatches.map(p => ({ ...p, matchType: 'name', confidence: 0.7 })),
        ]

        // Remove duplicates and sort by confidence
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
          index === self.findIndex(s => s.id === suggestion.id)
        ).sort((a, b) => b.confidence - a.confidence)

        suggestions = uniqueSuggestions.slice(0, 5) // Top 5 suggestions
      }
    }

    const stats = {
      totalPlayers: await prisma.player.count({ where: auctionId ? { auctionId } : {} }),
      linkedPlayers: await prisma.player.count({
        where: {
          isLinked: true,
          ...(auctionId && { auctionId })
        }
      }),
      unlinkedPlayers: await prisma.player.count({
        where: {
          isLinked: false,
          ...(auctionId && { auctionId })
        }
      }),
    }

    return NextResponse.json({
      success: true,
      players,
      suggestions,
      stats
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to get linking suggestions:', error)
    return NextResponse.json({
      error: 'Failed to get linking suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}