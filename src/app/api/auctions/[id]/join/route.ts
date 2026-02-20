import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest, getUserAuctionPermissions, validateAuctionPasscode, joinAuction } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const joinAuctionSchema = z.object({
  passcode: z.string().optional(),
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

    // Check current permissions
    let permissions = await getUserAuctionPermissions(user.id, auctionId)

    // If user can already join, proceed
    if (!permissions.canJoin) {
      // Try with passcode if provided
      if (validatedData.passcode) {
        const isValidPasscode = await validateAuctionPasscode(auctionId, validatedData.passcode)
        if (!isValidPasscode) {
          return NextResponse.json(
            { error: 'Invalid passcode' },
            { status: 403 }
          )
        }
        // Recheck permissions after passcode validation
        permissions = await getUserAuctionPermissions(user.id, auctionId, validatedData.passcode)
      }

      if (!permissions.canJoin) {
        return NextResponse.json(
          { error: 'Access denied. Invalid passcode or insufficient permissions.' },
          { status: 403 }
        )
      }
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
    const { searchParams } = new URL(request.url)
    const passcode = searchParams.get('passcode')

    const permissions = await getUserAuctionPermissions(
      user?.id || null,
      auctionId,
      passcode || undefined
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