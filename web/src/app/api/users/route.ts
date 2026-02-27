import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
    const supabase = await createClient()
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

    // Calculate pagination
    const skip = (page - 1) * limit
    const rangeEnd = skip + limit - 1

    // Map sortBy to snake_case column names
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy

    // Build the query - fetch users with their linked players for counting
    let query = supabase
      .from('users')
      .select('id, name, email, image, created_at, linked_players:players!user_id(id)', { count: 'exact' })

    // Search query - match name or email (OR condition)
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    }

    // Exclude specific user IDs
    if (excludeUserIds) {
      const excludeIds = excludeUserIds.split(',').map(id => id.trim()).filter(Boolean)
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }
    }

    // Apply sorting and pagination
    query = query
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range(skip, rangeEnd)

    const { data: users, count: totalCount, error } = await query

    if (error) {
      throw error
    }

    // Filter by hasLinkedPlayers if specified (done in JS since Supabase
    // doesn't natively support filtering by related record existence in a simple way)
    let filteredUsers = users || []

    if (typeof hasLinkedPlayers === 'boolean') {
      filteredUsers = filteredUsers.filter(user => {
        const linkedCount = user.linked_players?.length ?? 0
        return hasLinkedPlayers ? linkedCount > 0 : linkedCount === 0
      })
    }

    // Use totalCount from the query if no hasLinkedPlayers filter,
    // otherwise use filtered length (note: pagination may be slightly off with hasLinkedPlayers filter)
    const effectiveTotalCount = typeof hasLinkedPlayers === 'boolean'
      ? filteredUsers.length
      : (totalCount ?? 0)

    // Calculate pagination info
    const totalPages = Math.ceil(effectiveTotalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // Transform users to include linked player count
    const usersWithStats = filteredUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.created_at,
      linkedPlayersCount: user.linked_players?.length ?? 0
    }))

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      pagination: {
        page,
        limit,
        totalCount: effectiveTotalCount,
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
