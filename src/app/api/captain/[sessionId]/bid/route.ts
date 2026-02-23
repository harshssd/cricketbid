import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { verifyTeamAdminAccess, getAuthenticatedUser } from '@/lib/auth'
import { validateAndSubmitBid } from '@/lib/bid-utils'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

const bidSchema = z.object({
  roundId: z.string(),
  playerId: z.string(),
  amount: z.number().min(1)
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params
    const body = await request.json()

    // Validate request body
    const { roundId, playerId, amount } = bidSchema.parse(body)

    // Parse session ID — supports "auctionId_teamId" (underscore delimiter)
    const parts = sessionId.split('_')
    const auctionId = parts[0]
    const teamId = parts[1]

    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Bid requires auctionId_teamId format.' },
        { status: 400 }
      )
    }

    // Get authenticated user from middleware headers
    const { userId, userEmail } = getAuthenticatedUser(request)

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify team admin access (captain, vice-captain, or auction admin)
    const authResult = await verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)

    if (!authResult.success) {
      return NextResponse.json(
        {
          error: authResult.error,
          details: authResult.details,
          currentUser: authResult.currentUser
        },
        { status: authResult.statusCode || 403 }
      )
    }

    // Use shared validation + submission (bids attributed to team)
    const result = await validateAndSubmitBid({
      supabase,
      auctionId,
      teamId,
      roundId,
      playerId,
      amount,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json({
      success: true,
      bid: result.bid,
      message: `Bid of ${amount} submitted successfully for ${result.playerName}`
    })

  } catch (error) {
    console.error('Failed to submit bid:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bid data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to submit bid',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
