import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { validateAndSubmitBid } from '@/lib/bid-utils'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

const bidSchema = z.object({
  roundId: z.string(),
  playerId: z.string(),
  amount: z.number().min(1),
})

/**
 * Resolve a round ID for bidding. If the round ID is a legacy fallback
 * (rt-{playerId}), find or create a real round in the database so bids can
 * be validated and stored with proper foreign keys.
 */
async function resolveRoundId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roundId: string,
  auctionId: string,
  playerId: string
): Promise<string> {
  // Real round ID — use as-is
  if (!roundId.startsWith('rt-')) return roundId

  // Runtime-state fallback: find existing OPEN round for this auction
  const { data: existing } = await supabase
    .from('rounds')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('status', 'OPEN')
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  // No open round exists — create one on the fly
  // Look up player's tier
  const { data: player } = await supabase
    .from('players')
    .select('tier_id')
    .eq('id', playerId)
    .maybeSingle()

  const { data: round, error } = await supabase
    .from('rounds')
    .insert({
      auction_id: auctionId,
      player_id: playerId,
      tier_id: player?.tier_id || null,
      status: 'OPEN',
      opened_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[bid/resolveRoundId] Failed to create round:', error)
    throw new Error('Could not create round for bid')
  }

  console.log('[bid/resolveRoundId] Created round on-demand:', round.id)
  return round.id
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params
    const body = await request.json()

    // Validate request body
    const { roundId: rawRoundId, playerId, amount } = bidSchema.parse(body)

    // Parse session ID: "auctionId_teamId"
    const separatorIdx = sessionId.indexOf('_')
    if (separatorIdx === -1) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Use auctionId_teamId.' },
        { status: 400 }
      )
    }

    const auctionId = sessionId.slice(0, separatorIdx)
    const teamId = sessionId.slice(separatorIdx + 1)

    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format.' },
        { status: 400 }
      )
    }

    // Resolve rt- fallback round IDs to real DB rounds
    const roundId = await resolveRoundId(supabase, rawRoundId, auctionId, playerId)

    // Fetch team to verify it belongs to this auction
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found in this auction' },
        { status: 404 }
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

    // Broadcast bid update via Supabase Realtime
    const channel = supabase.channel(`auction-${auctionId}`)
    await channel.send({
      type: 'broadcast',
      event: 'bid-update',
      payload: {
        roundId,
        teamId,
        teamName: team.name,
        amount,
      },
    })
    await supabase.removeChannel(channel)

    return NextResponse.json({
      success: true,
      bid: result.bid,
      message: `Bid of ${amount} submitted successfully for ${result.playerName}`,
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
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
