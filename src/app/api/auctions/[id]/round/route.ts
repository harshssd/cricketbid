import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST — Open a new round for a player (no timer — round stays open until auctioneer closes it)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params
    const body = await request.json()
    const { playerId, tierId } = body

    console.log('[round/POST] Creating round:', { auctionId, playerId, tierId })

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
        { status: 400 }
      )
    }

    // Close any existing OPEN rounds for this auction
    const { error: closeError } = await supabase
      .from('rounds')
      .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')

    if (closeError) {
      console.error('[round/POST] Failed to close existing rounds:', closeError)
    }

    // Create a new OPEN round (no timer — auctioneer controls when to close)
    const now = new Date()

    const { data: round, error } = await supabase
      .from('rounds')
      .insert({
        auction_id: auctionId,
        player_id: playerId,
        tier_id: tierId || null,
        status: 'OPEN',
        opened_at: now.toISOString(),
      })
      .select('id, status, player_id, tier_id, opened_at, closed_at')
      .single()

    if (error) {
      console.error('[round/POST] Insert failed:', error)
      return NextResponse.json(
        { error: 'Failed to create round', details: error.message },
        { status: 500 }
      )
    }

    console.log('[round/POST] Round created:', round?.id)
    return NextResponse.json({ round })
  } catch (error) {
    console.error('[round/POST] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE — Close the current OPEN round
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params

    const { data, error } = await supabase
      .from('rounds')
      .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .select('id')

    if (error) {
      console.error('[round/DELETE] Failed:', error)
      return NextResponse.json(
        { error: 'Failed to close round', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      closed: data?.length ?? 0,
    })
  } catch (error) {
    console.error('[round/DELETE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
