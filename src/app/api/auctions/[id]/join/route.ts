import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest, getUserAuctionPermissions, joinAuction } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const joinAuctionSchema = z.object({
  role: z.enum(['CAPTAIN', 'VIEWER']).default('VIEWER'),
  teamId: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = joinAuctionSchema.parse(body)

    // Check current permissions (now checks league membership)
    const permissions = await getUserAuctionPermissions(user.id, auctionId)

    if (!permissions.canJoin) {
      return NextResponse.json(
        { error: 'Access denied. You must be a member of the league to join this auction.' },
        { status: 403 }
      )
    }

    // Join the auction
    const success = await joinAuction(
      user.id,
      auctionId,
      validatedData.role,
      validatedData.teamId
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to join auction' },
        { status: 500 }
      )
    }

    // Get updated permissions
    const updatedPermissions = await getUserAuctionPermissions(user.id, auctionId)

    return NextResponse.json({
      success: true,
      permissions: updatedPermissions,
      message: 'Successfully joined auction'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to join auction:', error)
    return NextResponse.json(
      { error: 'Failed to join auction' },
      { status: 500 }
    )
  }
}

// Check auction access permissions
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const user = await getUserFromRequest(request)

    const permissions = await getUserAuctionPermissions(
      user?.id || null,
      auctionId
    )

    return NextResponse.json({
      permissions,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      } : null
    })

  } catch (error) {
    console.error('Failed to check auction permissions:', error)
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}