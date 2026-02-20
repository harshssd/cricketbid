import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Draft schema - allows partial data
const draftSchema = z.object({
  currentStep: z.number(),
  setupMode: z.enum(['WIZARD', 'MANUAL']).optional(),
  basicInfo: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    scheduledAt: z.union([z.string(), z.date()]).optional(),
    timezone: z.string().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    passcode: z.string().optional(),
  }).optional(),
  organizationSelect: z.object({
    creationType: z.enum(['STANDALONE', 'LEAGUE']).optional(),
    organizationId: z.string().optional(),
    organizationName: z.string().optional(),
    organizationCode: z.string().optional(),
    organizationType: z.enum(['league']).optional(),
    inheritBranding: z.boolean().optional(),
    restrictToMembers: z.boolean().optional(),
  }).optional(),
  config: z.object({
    budgetPerTeam: z.number().optional(),
    currencyName: z.string().optional(),
    currencyIcon: z.string().optional(),
    squadSize: z.number().optional(),
    numTeams: z.number().optional(),
  }).optional(),
  wizardInputs: z.object({
    playerCount: z.number().optional(),
    teamCount: z.number().optional(),
    skillSpread: z.enum(['MOSTLY_EVEN', 'SOME_STARS', 'WIDE_RANGE']).optional(),
    competitiveness: z.enum(['CASUAL', 'MODERATE', 'HIGHLY_COMPETITIVE']).optional(),
    duration: z.enum(['UNDER_1HR', 'ONE_TO_TWO_HRS', 'NO_RUSH']).optional(),
  }).optional(),
  teams: z.array(z.object({
    name: z.string(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    logo: z.string().optional(),
  })).optional(),
  tiers: z.array(z.object({
    name: z.string(),
    basePrice: z.number().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    minPerTeam: z.number().optional(),
    maxPerTeam: z.number().optional(),
    sortOrder: z.number().optional(),
  })).optional(),
  branding: z.object({
    logo: z.string().optional(),
    banner: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    bgImage: z.string().optional(),
    font: z.string().optional(),
    themePreset: z.string().optional(),
    tagline: z.string().optional(),
  }).optional(),
  isDraft: z.boolean().default(true),
  lastModified: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the draft data
    const validatedDraft = draftSchema.parse(body)

    // For now, we'll just return success - in a real app, this might save to database
    // or perform other draft-related operations

    // Mock draft ID for demonstration
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      draftId,
      message: 'Draft saved successfully',
      savedAt: new Date().toISOString(),
      data: validatedDraft
    }, { status: 200 })

  } catch (error) {
    console.error('Draft saving error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to save draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // This could be used to retrieve saved drafts
  try {
    // For now, return empty - in a real app, this would fetch from database
    return NextResponse.json({
      drafts: [],
      message: 'No saved drafts found'
    }, { status: 200 })

  } catch (error) {
    console.error('Draft retrieval error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve drafts'
    }, { status: 500 })
  }
}