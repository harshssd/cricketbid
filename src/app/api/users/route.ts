import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const searchUsersSchema = z.object({
  searchQuery: z.string().optional(),
  excludeUserIds: z.string().optional(), // Comma-separated list of user IDs to exclude
  hasLinkedPlayers: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const {
      searchQuery,
      excludeUserIds,
      hasLinkedPlayers,
      page,
      limit,
      sortBy,
      sortOrder
    } = searchUsersSchema.parse({
      searchQuery: searchParams.get('searchQuery'),
      excludeUserIds: searchParams.get('excludeUserIds'),
      hasLinkedPlayers: searchParams.get('hasLinkedPlayers') === 'true' ? true :
                       searchParams.get('hasLinkedPlayers') === 'false' ? false : undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    // Build where clause
    let whereClause: any = {}

    // Search query - match name or email
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Exclude specific user IDs
    if (excludeUserIds) {
      const excludeIds = excludeUserIds.split(',').map(id => id.trim()).filter(Boolean)
      if (excludeIds.length > 0) {
        whereClause.id = { notIn: excludeIds }
      }
    }

    // Filter by users with/without linked players
    if (typeof hasLinkedPlayers === 'boolean') {
      if (hasLinkedPlayers) {
        whereClause.linkedPlayers = {
          some: { isLinked: true }
        }
      } else {
        whereClause.NOT = {
          linkedPlayers: {
            some: { isLinked: true }
          }
        }
      }
    }

    // Build order by
    let orderBy: any = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder
    } else {
      orderBy.name = sortOrder
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get users and total count
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          _count: {
            select: {
              linkedPlayers: {
                where: { isLinked: true }
              }
            }
          }
        },
        orderBy: orderBy,
        skip: skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Transform users to include linked player count
    const usersWithStats = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      linkedPlayersCount: user._count.linkedPlayers
    }))

    return NextResponse.json({
      success: true,
      users: usersWithStats,
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
        excludeUserIds,
        hasLinkedPlayers
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to search users:', error)
    return NextResponse.json({
      error: 'Failed to search users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}