import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET - Load auction runtime state
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        status: true,
        runtimeState: true,
      }
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: auction.status,
      runtimeState: auction.runtimeState,
    })
  } catch (error) {
    console.error('Failed to load auction state:', error)
    return NextResponse.json({ error: 'Failed to load auction state' }, { status: 500 })
  }
}

// PUT - Save auction runtime state (full replace)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()

    const { runtimeState, status } = body

    const updateData: any = {}
    if (runtimeState !== undefined) updateData.runtimeState = runtimeState
    if (status) updateData.status = status

    const auction = await prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
      select: {
        id: true,
        status: true,
        runtimeState: true,
      }
    })

    return NextResponse.json({
      success: true,
      status: auction.status,
      runtimeState: auction.runtimeState,
    })
  } catch (error) {
    console.error('Failed to save auction state:', error)
    return NextResponse.json({ error: 'Failed to save auction state' }, { status: 500 })
  }
}
