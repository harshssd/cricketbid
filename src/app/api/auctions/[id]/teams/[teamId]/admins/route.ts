import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const addAdminSchema = z.object({
  userEmail: z.string().email(),
  role: z.enum(['CAPTAIN', 'MEMBER']).default('MEMBER')
})

const removeAdminSchema = z.object({
  userId: z.string()
})

// GET - List team admins
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, owner_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Fetch team with captain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, captain_id, captain:users!captain_id(id, name, email, image)')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError) throw teamError

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const captain = team.captain as unknown as { id: string; name: string; email: string; image: string | null } | null

    // Check if user has permission (auction owner or team captain)
    const canManage = auction.owner_id === userId || captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can manage admins' },
        { status: 403 }
      )
    }

    // Fetch team members with CAPTAIN or MEMBER role
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('role, user:users!user_id(id, name, email, image)')
      .eq('team_id', teamId)
      .in('role', ['CAPTAIN', 'MEMBER'])

    if (membersError) throw membersError

    // Build admin list
    const admins: Array<{
      id: string
      name: string
      email: string
      image: string | null
      role: string
      source: string
    }> = []

    // Add team captain if exists
    if (captain) {
      admins.push({
        id: captain.id,
        name: captain.name,
        email: captain.email,
        image: captain.image,
        role: 'CAPTAIN',
        source: 'team_captain'
      })
    }

    // Add team members with admin roles
    if (members) {
      members.forEach((member) => {
        const user = member.user as unknown as { id: string; name: string; email: string; image: string | null }
        if (user.id !== captain?.id) { // Don't duplicate captain
          admins.push({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: member.role,
            source: 'team_member'
          })
        }
      })
    }

    return NextResponse.json({
      teamId,
      teamName: team.name,
      admins,
      canManage
    })

  } catch (error) {
    console.error('Failed to fetch team admins:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch team admins',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Add team admin
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { userEmail, role } = addAdminSchema.parse(body)

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, owner_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Fetch team with captain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, captain_id, captain:users!captain_id(id, name, email)')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError) throw teamError

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const captain = team.captain as unknown as { id: string; name: string; email: string } | null

    // Check permission
    const canManage = auction.owner_id === userId || captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can add admins' },
        { status: 403 }
      )
    }

    // Find user to add
    const { data: userToAdd, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', userEmail)
      .maybeSingle()

    if (userError) throw userError

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'User not found with this email address' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userToAdd.id)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingMember) {
      // Update existing member's role
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userToAdd.id)

      if (updateError) throw updateError
    } else {
      // Create new team member
      const { error: createError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userToAdd.id,
          role
        })

      if (createError) throw createError
    }

    return NextResponse.json({
      success: true,
      message: `${userToAdd.name} has been added as ${role.replace('_', ' ').toLowerCase()}`,
      user: userToAdd,
      role
    })

  } catch (error) {
    console.error('Failed to add team admin:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to add team admin',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove team admin
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { userId: userIdToRemove } = removeAdminSchema.parse(body)

    // Get authenticated user
    const { userId } = getAuthenticatedUser(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, owner_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Fetch team with captain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, captain_id, captain:users!captain_id(id, name, email)')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError) throw teamError

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const captain = team.captain as unknown as { id: string; name: string; email: string } | null

    // Check permission
    const canManage = auction.owner_id === userId || captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can remove admins' },
        { status: 403 }
      )
    }

    // Cannot remove the main team captain
    if (captain?.id === userIdToRemove) {
      return NextResponse.json(
        { error: 'Cannot remove the main team captain. Change the captain first.' },
        { status: 400 }
      )
    }

    // Remove team member
    const { data: deletedMember, error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userIdToRemove)
      .select('*, user:users!user_id(name, email)')
      .single()

    if (deleteError) throw deleteError

    const deletedUser = deletedMember.user as unknown as { name: string; email: string }

    return NextResponse.json({
      success: true,
      message: `${deletedUser.name} has been removed from team admins`,
      removedUser: deletedUser
    })

  } catch (error) {
    console.error('Failed to remove team admin:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to remove team admin',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
