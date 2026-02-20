import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const addParticipantsSchema = z.object({
  participants: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['CAPTAIN', 'MODERATOR', 'VIEWER']).default('CAPTAIN'),
    teamId: z.string().optional(),
  })).min(1, 'At least one participant is required'),
  skipExisting: z.boolean().default(true),
})

// GET - List participants
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params

    const participations = await prisma.auctionParticipation.findMany({
      where: { auctionId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        team: {
          select: { id: true, name: true, primaryColor: true }
        }
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
    })

    return NextResponse.json({
      participations,
      stats: {
        total: participations.length,
        owners: participations.filter(p => p.role === 'OWNER').length,
        moderators: participations.filter(p => p.role === 'MODERATOR').length,
        captains: participations.filter(p => p.role === 'CAPTAIN').length,
        viewers: participations.filter(p => p.role === 'VIEWER').length,
      }
    })
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}

// POST - Add participants (from CSV upload or manual add)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()
    const { participants, skipExisting } = addParticipantsSchema.parse(body)

    // Verify auction exists
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true }
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const results = {
      added: 0,
      skipped: 0,
      created: 0,
      errors: [] as string[],
      details: [] as { name: string; email: string; status: string }[],
    }

    for (const participant of participants) {
      try {
        // Find or create user by email
        let user = await prisma.user.findUnique({
          where: { email: participant.email },
          select: { id: true, name: true, email: true }
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              name: participant.name,
              email: participant.email,
            },
            select: { id: true, name: true, email: true }
          })
          results.created++
        }

        // Check if already a participant
        const existing = await prisma.auctionParticipation.findFirst({
          where: { auctionId, userId: user.id }
        })

        if (existing) {
          if (skipExisting) {
            results.skipped++
            results.details.push({
              name: participant.name,
              email: participant.email,
              status: `Skipped (already ${existing.role})`
            })
            continue
          }
          await prisma.auctionParticipation.update({
            where: { id: existing.id },
            data: {
              role: participant.role,
              teamId: participant.teamId || existing.teamId,
            }
          })
          results.added++
          results.details.push({
            name: participant.name,
            email: participant.email,
            status: `Updated to ${participant.role}`
          })
          continue
        }

        await prisma.auctionParticipation.create({
          data: {
            auctionId,
            userId: user.id,
            role: participant.role,
            teamId: participant.teamId || null,
          }
        })
        results.added++
        results.details.push({
          name: participant.name,
          email: participant.email,
          status: `Added as ${participant.role}`
        })

      } catch (err) {
        const msg = `Failed to add ${participant.name} (${participant.email}): ${err instanceof Error ? err.message : 'Unknown error'}`
        results.errors.push(msg)
        results.details.push({
          name: participant.name,
          email: participant.email,
          status: 'Error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${results.added} participant(s)${results.skipped > 0 ? `, skipped ${results.skipped} existing` : ''}${results.created > 0 ? `, created ${results.created} new user(s)` : ''}`,
      results,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Failed to add participants:', error)
    return NextResponse.json(
      { error: 'Failed to add participants' },
      { status: 500 }
    )
  }
}
