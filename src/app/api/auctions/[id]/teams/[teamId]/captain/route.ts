import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const changeCaptainSchema = z.object({
  newCaptainId: z.string()
})

// PUT - Change team captain
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()

    // Validate request body
    const { newCaptainId } = changeCaptainSchema.parse(body)

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

    // Fetch the team with its captain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, captain_user_id, captain:users!captain_user_id(id, name, email)')
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

    // Check permission (auction owner or current team captain)
    const captain = team.captain as unknown as { id: string; name: string; email: string } | null
    const canManage = auction.owner_id === userId || captain?.id === userId

    if (!canManage) {
      return NextResponse.json(
        { error: 'Permission denied - only auction owners and team captains can change captains' },
        { status: 403 }
      )
    }

    // Verify new captain has an auction participation
    const { data: newCaptainParticipation, error: participationError } = await supabase
      .from('auction_participations')
      .select('*, user:users!user_id(id, name, email)')
      .eq('auction_id', auctionId)
      .eq('user_id', newCaptainId)
      .maybeSingle()

    if (participationError) throw participationError

    if (!newCaptainParticipation) {
      return NextResponse.json(
        { error: 'New captain must be an auction participant' },
        { status: 400 }
      )
    }

    const newCaptainUser = newCaptainParticipation.user as unknown as { id: string; name: string; email: string }

    // Update team captain
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({ captain_user_id: newCaptainId })
      .eq('id', teamId)
      .select('id, name, captain_user_id, captain:users!captain_user_id(id, name, email)')
      .single()

    if (updateError) throw updateError

    // Ensure the new captain has a participation linked to this team
    if (newCaptainParticipation.team_id !== teamId) {
      await supabase
        .from('auction_participations')
        .update({ team_id: teamId, role: 'CAPTAIN' })
        .eq('id', newCaptainParticipation.id)
    }

    return NextResponse.json({
      success: true,
      message: `${newCaptainUser.name} has been promoted to team captain`,
      newCaptain: {
        id: newCaptainUser.id,
        name: newCaptainUser.name,
        email: newCaptainUser.email
      },
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        captainId: updatedTeam.captain_user_id
      }
    })

  } catch (error) {
    console.error('Failed to change team captain:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to change team captain',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
