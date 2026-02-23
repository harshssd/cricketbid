import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET - Load auction queue state
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params

    const { data: auction, error } = await supabase
      .from('auctions')
      .select('id, status, queue_state')
      .eq('id', auctionId)
      .maybeSingle()

    if (error) throw error

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: auction.status,
      queueState: auction.queue_state,
    })
  } catch (error) {
    console.error('Failed to load auction state:', error)
    return NextResponse.json({ error: 'Failed to load auction state' }, { status: 500 })
  }
}

// PUT - Save auction queue state (full replace)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params
    const body = await request.json()

    const { queueState, status } = body

    const updateData: Record<string, any> = {}
    if (queueState !== undefined) updateData.queue_state = queueState
    if (status) updateData.status = status

    const { data: auction, error } = await supabase
      .from('auctions')
      .update(updateData)
      .eq('id', auctionId)
      .select('id, status, queue_state')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      status: auction.status,
      queueState: auction.queue_state,
    })
  } catch (error) {
    console.error('Failed to save auction state:', error)
    return NextResponse.json({ error: 'Failed to save auction state' }, { status: 500 })
  }
}
